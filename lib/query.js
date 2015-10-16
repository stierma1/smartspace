
var winston = require("winston");
var uuid = require("uuid");

function Query(graph, facts, provider, predicate, groundings){
  this.graph = graph;
  this.provider = provider;
  this.predicate = predicate;
  this.groundings = groundings;
  this.facts = facts;
  this.uuid = uuid.v4();

  this.results = {};

  winston.log("info", "Query created", {uuid:this.uuid});
  winston.log("debug", "Query params [%s %s %j]",  provider, predicate, groundings, {provider:provider, predicate:predicate, groundings:groundings});
}

Query.prototype.execute = function(){
  try{
    winston.profile(this.uuid);
    this.result = {};
    this._execute();
    winston.log("info", "Query execution successful", {uuid:this.uuid});
  } catch(err){
    this.result = err;
    winston.log("info", "Query execution failed", {uuid:this.uuid});
    winston.log("error", "Query execution failed %j", err, {uuid:this.uuid});
  } finally{
    winston.profile(this.uuid);
  }
}

Query.prototype._execute = function(){

  var self = this;
  winston.log("info", "Query executing", {uuid:this.uuid});

  if(!this.hasProviderStateChanged()){
      return;
  }

  this.facts.update(this.provider, this.predicate, this.groundings);
  var classes = this.graph.getNodeByEdge("provider/" + this.provider, "is_a");
  var classCtxRules = classes.map(function(classs){
    return self.graph.getNodeByEdge(classs, "provider");
  }).reduce(function(red, ctxRule){
    return red.concat(ctxRule);
  });

  var providerCtxRules = this.graph.getNodeByEdge("provider/" + this.provider, "provider");
  providerCtxRules = providerCtxRules.concat(classCtxRules);
  var predicateCtxRules = this.graph.getNodeByEdge("predicate/" + this.predicate, "member_of_back");

  var matchedCtxRules = this.matchProviderPredicate(providerCtxRules, predicateCtxRules);

  var rules = matchedCtxRules.map(function(ctxRule){
    return self.graph.getNodeByEdge(ctxRule, "rule_of");
  }).reduce(function(red, rules){
    return red.concat(rules);
  }, []);

  winston.log("debug", "Rules found %j", rules, {uuid: this.uuid});

  if(rules.length === 0){
    winston.log("info", "No Rules found", {uuid: this.uuid});
    return;
  }

  var satRules = rules.filter(function(rule){
    return self.isRuleSatisfied(rule, classes);
  });

  winston.log("debug", "Satisfied rules %j", rules, {uuid:this.uuid});

  satRules.map(function(rule){
    self.results[rule] = self.getRulePayload(rule);
    winston.log("debug", "Satisfied rules %j", rules, {uuid:self.uuid});
  });

  return;
}

Query.prototype.matchProviderPredicate = function(providerCtxRules, predicateCtxRules){
  var _matchedRules = {};
  for(var i = 0; i < predicateCtxRules.length; i++){
    _matchedRules[i] = 0;
  }
  for(var i = 0; i < providerCtxRules.length; i++){
    if(_matchedRules[i]){
      _matchedRules[i]++;
    }
  }

  var matchedRules = [];
  for(var i in _matchedRules){
    if(_matchedRules[i] === 1){
      matchedRules.push(i);
    }
  }

  return matchedRules;
}

Query.prototype.hasProviderStateChanged = function(){
  var groundings = this.facts.getGroundings(this.provider, this.predicate);
  var self = this;

  var groundingsMatch = !!groundings && groundings.reduce(function(red, val, idx){
    return red && (val === "_" || val === self.groundings[idx]);
  }, true);

  return !groundingsMatch;
}

Query.prototype.isRuleSatisfied = function(ruleId, classes){
  var self = this;
  var earlyExit = false;
  var ctxRules = this.graph.getNodeByEdge(ruleId, "rule_element");

  var ctxRulesContents = ctxRules.map(function(ctxRule){
    return {
      provider:self.graph.GetVertex(self.graph.getNodeByEdge(ctxRule, "provider_back").pop()).data.value,
      predicate:self.graph.GetVertex(self.graph.getNodeByEdge(ctxRule, "predicate_back").pop()).data.value,
      groundings:self.graph.GetVertex(self.graph.getNodeByEdge(ctxRule, "groundings_back").pop()).data.value
    };
  });

  var providers = ctxRulesContents.map(function(val){return val.provider;}).filter(function(val){
    return !!val.provider;
  });

  var classThis = ctxRulesContents.map(function(val){return val.provider;}).filter(function(val){
    if(val.quantifier === "invoker"){
      if(val.class && classes.indexOf("class/" + val.class) !== -1){
        return true;
      }
      earlyExit = true; //Found a class the invoker is not a member of therefore the entire rule is not satisfable
      winston.log("debug", "Invoker %s is not a member of %s", self.provider, val.class, {uuid: self.uuid});
    }
    return false;
  });

  if(earlyExit){
    return false;
  }

  var classExists = ctxRulesContents.filter(function(val){
    return val.provider.quantifier === "exist" && !!val.provider.class;
  });

  var classNotExists = ctxRulesContents.filter(function(val){
    return val.provider.quantifier === "not_exist" && !!val.provider.class;
  });

  var classAll = ctxRulesContents.filter(function(val){
    return val.provider.quantifier === "all" && !!val.provider.class;
  });

  var classNotAll = ctxRulesContents.filter(function(val){
    return val.provider.quantifier === "not_all" && !!val.provider.class;
  });

  return this._areProviderRulesSatisfied(providers) &&
         this._areInvokerRulesSatisfied(classThis) &&
         this._areClassExistsRulesSatisfied(classExists) &&
         this._areClassAllRulesSatisfied(classAll) &&
         !this._areClassExistsRulesSatisfied(classNotExists) &&
         !this._areClassAllRulesSatisfied(classNotAll);
}

Query.prototype._areProviderRulesSatisfied = function(ruleContents){
  var self = this;
  return ruleContents.reduce(function(red, ruleContent){
    return red && self.facts.matchExists(ruleContent.provider, ruleContent.predicate, ruleContent.groundings);
  }, true);
}

Query.prototype._areInvokerRulesSatisfied = function(ruleContents){
  var self = this;
  return ruleContents.reduce(function(red, ruleContent){
    return red && self.facts.matchExists(self.provider, ruleContent.predicate, ruleContent.groundings);
  }, true);
}

Query.prototype._areClassExistsRulesSatisfied = function(ruleContents){
  var self = this;
  return ruleContents.reduce(function(red, ruleContent){
    var instances = self.graph.getNodeByEdge("class/" + ruleContent.provider.class, "classifies");
    return red && instances.reduce(function(red2, instance){
      return red2 || self.facts.matchExists(removeTypeLabel(instance), ruleContent.predicate, ruleContent.groundings);
    }, false);
  }, true);
}

Query.prototype._areClassAllRulesSatisfied = function(ruleContents){
  var self = this;
  return ruleContents.reduce(function(red, ruleContent){
    var instances = self.graph.getNodeByEdge("class/" + ruleContent.provider.class, "classifies");
    return red && instances.reduce(function(red2, instance){
      return red2 && self.facts.matchExists(removeTypeLabel(instance), ruleContent.predicate, ruleContent.groundings);
    }, true);
  }, true);
}

Query.prototype.getRulePayload = function(rule){
  return "Under Contruction";
}

function removeTypeLabel(label){
  return label.split("/")[1];
}

module.exports = Query;
