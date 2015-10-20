
var winston = require("winston");
var uuid = require("uuid");
var _ = require("lodash");

function Query(graph, facts, provider, predicate, groundings){
  this.graph = graph;
  this.provider = provider;
  this.predicate = predicate;
  this.groundings = groundings;
  this.facts = facts;
  this.uuid = uuid.v4();
  this.error = null;
  this.classes = [];
  this._logObj = {uuid:this.uuid};

  this.results = {};

  winston.log("info", "Query created", this._logObj);
  winston.log("debug", "Query params [%s %s %j]",  provider, predicate, groundings, {uuid: this.uuid, provider:provider, predicate:predicate, groundings:groundings});
}

Query.prototype.execute = function(){
  try{
    winston.profile(this.uuid);
    var sat = this._execute();
    winston.log("info", "Query execution successful", this._logObj);
    return sat;
  } catch(err){
    winston.log("info", "Query execution failed", this._logObj);
    winston.log("error", "%j", err.stack, this._logObj);
    return err;
  } finally{
    winston.profile(this.uuid);
  }
}

Query.prototype._execute = function(){

  var self = this;
  winston.log("info", "Query executing", this._logObj);

  var classes = this.graph.getNodeByEdge("provider/" + this.provider, "is_a");
  this.classes = classes;

  var classCtxRules = classes.map(function(classs){
    return self.graph.getNodeByEdge(classs, "provider");
  }).reduce(function(red, ctxRule){
    return red.concat(ctxRule);
  }, []);

  var providerCtxRules = this.graph.getNodeByEdge("provider/" + this.provider, "provider");
  providerCtxRules = providerCtxRules.concat(classCtxRules);

  winston.log("debug", "Provider and Class Ctxrules found %j", providerCtxRules, this._logObj);

  var predicateCtxRules = this.graph.getNodeByEdge("predicate/" + this.predicate, "predicates");

  winston.log("debug", "Predicate CtxRules found %j", predicateCtxRules, this._logObj);

  var matchedCtxRules = this.matchProviderPredicate(providerCtxRules, predicateCtxRules);

  winston.log("debug", "Matched CtxRules found %j", matchedCtxRules, this._logObj);

  var rules = matchedCtxRules.map(function(ctxRule){
    return self.graph.getNodeByEdge(ctxRule, "element_of");
  }).reduce(function(red, rules){
    return red.concat(rules);
  }, []);

  var rules = _.unique(rules);

  winston.log("debug", "Rules found %j", rules, this._logObj);

  if(rules.length === 0){
    winston.log("info", "No Rules found", this._logObj);
    return;
  }

  var satRules = rules.filter(function(rule){
    return self.isRuleSatisfied(rule, classes);
  });

  winston.log("debug", "Satisfied rules %j", satRules, this._logObj);

  return satRules;
}

Query.prototype.matchProviderPredicate = function(providerCtxRules, predicateCtxRules){
  var _matchedRules = {};
  for(var i = 0; i < predicateCtxRules.length; i++){
    _matchedRules[predicateCtxRules[i]] = 0;
  }

  for(var i = 0; i < providerCtxRules.length; i++){
    if(_matchedRules[providerCtxRules[i]] !== undefined){
      _matchedRules[providerCtxRules[i]]++;
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

  winston.log("debug", "Rule %j ctx rules consists of %j", ruleId, ctxRules, this._logObj);

  var ctxRulesContents = ctxRules.map(function(ctxRule){
    return self.graph.GetVertex(ctxRule).data;
  });

  winston.log("debug", "Ctx Rule Contents %j", ctxRulesContents, this._logObj);

  var providers = ctxRulesContents.filter(function(val){
    return !!val.provider.provider;
  });

  var classThis = ctxRulesContents.filter(function(val){
    if(val.provider.quantifier === "this"){
      if(val.provider && val.provider.class && classes.indexOf("class/" + val.provider.class) !== -1){
        return true;
      }
      earlyExit = true; //Found a class the invoker is not a member of therefore the entire rule is not satisfable
      winston.log("debug", "This %s is not a member of %s", self.provider, val.provider.class, self._logObj);
    }
    return false;
  });

  if(earlyExit || (classThis.length === 0 && providers.length === 0)){
    return false;
  }

  var classExists = ctxRulesContents.filter(function(val){
    return val.provider.quantifier === "exists" && !!val.provider.class;
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
         this._areClassNotExistsRulesSatisfied(classNotExists) &&
         this._areClassNotAllRulesSatisfied(classNotAll);
}

Query.prototype._areProviderRulesSatisfied = function(ruleContents){
  var self = this;

  var rulesSatisfied = ruleContents.reduce(function(red, ruleContent){
    return red && self.facts.matchExists(ruleContent.provider.provider, ruleContent.predicate, ruleContent.groundings);
  }, true);

  winston.log("debug", "Providers satisfied %j", rulesSatisfied, this._logObj);
  return rulesSatisfied;
}

Query.prototype._areInvokerRulesSatisfied = function(ruleContents){
  var self = this;
  return ruleContents.reduce(function(red, ruleContent){
    return red && self.facts.matchExists(self.provider, ruleContent.predicate, ruleContent.groundings);
  }, true);
}

Query.prototype._areClassNotExistsRulesSatisfied = function(ruleContents){
  var self = this;

  if(ruleContents.length === 0){
    return true;
  }

  return !this._areClassExistsRulesSatisfied(rulesContents);
}

Query.prototype._areClassExistsRulesSatisfied = function(ruleContents){
  var self = this;
  var rulesSatisfied = ruleContents.reduce(function(red, ruleContent){
    var instances = self.graph.getNodeByEdge("class/" + ruleContent.provider.class, "classifies");
    return red && instances.reduce(function(red2, instance){
      return red2 || self.facts.matchExists(removeTypeLabel(instance), ruleContent.predicate, ruleContent.groundings);
    }, false);
  }, true);

  winston.log("debug", "Class exists satisfied %j", rulesSatisfied, this._logObj);

  return rulesSatisfied;
}

Query.prototype._areClassNotAllRulesSatisfied = function(ruleContents){
  var self = this;

  if(ruleContents.length === 0){
    return true;
  }

  return !this._areClassAllRulesSatisfied(rulesContents);
}

Query.prototype._areClassAllRulesSatisfied = function(ruleContents){
  var self = this;

  var rulesSatisfied = ruleContents.reduce(function(red, ruleContent){
    var instances = self.graph.getNodeByEdge("class/" + ruleContent.provider.class, "classifies");
    return red && instances.reduce(function(red2, instance){
      return red2 && self.facts.matchExists(removeTypeLabel(instance), ruleContent.predicate, ruleContent.groundings);
    }, true);
  }, true);


  return rulesSatisfied;
}

Query.prototype.getPayload = function(ruleFullId){
  var self = this;
  var inCtxRules = this.graph.getNodeByEdge(ruleFullId, "rule_element");

  var inCtxRulesContents = inCtxRules.map(function(id){
    return self.graph.GetVertex(id).data;
  });

  var providers = inCtxRulesContents.filter(function(val){
    return !!val.provider.provider;
  });

  var classThis = inCtxRulesContents.filter(function(val){
    if(val.provider.quantifier === "this"){
      if(val.provider && val.provider.class && self.classes.indexOf("class/" + val.provider.class) !== -1){
        return true;
      }
    }
    return false;
  });

  var classExists = inCtxRulesContents.filter(function(val){
    return val.provider.quantifier === "exists" && !!val.provider.class;
  }).map(function(val){
    var matched = self.graph.getNodeByEdge("class/" + val.provider.class, "classifies");
    if(matched.length > 0){
      return self.facts.getPayload(removeTypeLabel(matched[0]), val.predicate);
    }
    return null; //If not provider matches needed class
  }).filter(function(val){
    return val !== null;
  });

  var classAll = inCtxRulesContents.filter(function(val){
    return val.provider.quantifier === "all" && !!val.provider.class;
  }).map(function(val){
    var matched = self.graph.getNodeByEdge("class/" + val.provider.class, "classifies");
    var vals = matched.map(function(match){
      return self.facts.getPayload(removeTypeLabel(match), val.predicate);
    })

    return vals;
  })

  var results = [];

  results = results.concat(classExists);

  for(var i in providers){
    var contents = providers[i];
    results.push(this.facts.getPayload(contents.provider.provider, contents.predicate));
  }
  for(var i in classThis){
    var contents = classThis[i];
    results.push(this.facts.getPayload(this.provider, contents.predicate));
  }

  classAll.map(function(val){
    for(var i in val){
      results.push(val[i]);
    }
  });

  return results;
  return "Under Contruction";
}

Query.prototype.getOutputProviders = function(ruleFullId){
  var self = this;
  var outCtxRules = this.graph.getNodeByEdge(ruleFullId, "action_element");

  var outCtxRulesContents = outCtxRules.map(function(id){
    return self.graph.GetVertex(id).data;
  });

  var providers = outCtxRulesContents.filter(function(val){
    return !!val.provider.provider;
  });

  var classThis = outCtxRulesContents.filter(function(val){
    if(val.provider.quantifier === "this"){
      if(val.provider && val.provider.class && self.classes.indexOf("class/" + val.provider.class) !== -1){
        return true;
      }
    }
    return false;
  });

  var classExists = outCtxRulesContents.filter(function(val){
    return val.provider.quantifier === "exists" && !!val.provider.class;
  }).map(function(val){
    var matched = self.graph.getNodeByEdge("class/" + val.provider.class, "classifies");
    if(matched.length > 0){
      return {provider:removeTypeLabel(matched[0]), predicate:val.predicate, groundings:val.groundings};
    }
    return null; //If not provider matches needed class
  }).filter(function(val){
    return val !== null;
  });

  var classAll = outCtxRulesContents.filter(function(val){
    return val.provider.quantifier === "all" && !!val.provider.class;
  }).map(function(val){
    var matched = self.graph.getNodeByEdge("class/" + val.provider.class, "classifies");
    var vals = matched.map(function(match){
      return {provider:removeTypeLabel(match), predicate:val.predicate, groundings:val.groundings};
    })

    return vals;
  })

  var results = [];

  results = results.concat(classExists);

  for(var i in providers){
    var contents = providers[i];
    results.push({provider: contents.provider.provider, predicate:contents.predicate, groundings:contents.groundings});
  }
  for(var i in classThis){
    var contents = classThis[i];
    results.push({provider: this.provider, predicate:contents.predicate, groundings:contents.groundings});
  }

  classAll.map(function(val){
    for(var i in val){
      results.push(val[i]);
    }
  });

  return results;
}

function removeTypeLabel(label){
  return label.split("/")[1];
}

module.exports = Query;
