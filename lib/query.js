
var winston = require("winston");
var uuid = require("uuid");

function Query(graph, provider, predicate, groundings){
  this.graph = graph;
  this.provider = provider;
  this.predicate = predicate;
  this.groundings = groundings;
  this.uuid = uuid.v4();

  this.results = {};

  winston.log("info", "Query created %s", this.uuid, {uuid:this.uuid});
  winston.log("debug", "Query params [%s %s %j]",  provider, predicate, groundings, {provider:provider, predicate:predicate, groundings:groundings});
}

Query.prototype.execute = function(){
  try{
    winston.profile(this.uuid);
    this.result = {};
    this._execute();
  } catch(err){
    this.result = err;
  } finally{
    winston.profile(this.uuid);
  }
}

Query.prototype._execute = function(){

  var self = this;
  winston.log("info", "Query executing %s", this.uuid, {uuid:this.uuid});

  if(!this.hasProviderStateChanged()){
      return;
  }
  
  this.graph._updateProvider(this.provider, this.predicate, this.groundings);
  var classes = this.graph.getNodeByEdge("provider/" + this.provider, "is_a");
  var classCtxRules = classes.map(function(classs){
    return self.graph.getNodeByEdge("class/" + classs, "provider");
  }).reduce(function(red, ctxRule){
    return red.concat(ctxRule);
  });

  var providerCtxRules = this.graph.getNodeByEdge("provider/" + this.provider, "provider");
  providerCtxRules = providerCtxRules.concat(classCtxRules);
  var predicateCtxRules = this.graph.getNodeByEdge("predicate/" + this.predicate, "member_of_back");

  var matchedCtxRules = this.matchProviderPredicate(providerCtxRules, predicateCtxRules);

  var rules = matchedCtxRules.map(function(ctxRule){
    return self.graph.getNodeByEdge("rule/" + ctxRule, "rule_of");
  }).reduce(function(red, rules){
    return red.concat(rules);
  }, []);

  winston.log("debug", "Rules found %j", rules, {uuid: this.uuid});

  if(rules.length === 0){
    winston.log("info", "No Rules found", {uuid: this.uuid});
    return;
  }

  var satRules = rules.filter(function(rule){
    return self.isRuleSatisfied(rule);
  });

  winston.log("debug", "Satisfied rules %j", rules, {uuid:this.uuid});

  satRules.map(function(rule){
    self.results[rule] = self.getRulePayload(rule);
    winston.log("debug", "Satisfied rules %j", rules, {uuid:this.uuid});
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
  var predicates = this.graph.getNodeByEdge("provider/" + this.provider, "predicates");
  var matchedPredicate = predicates.filter(function(predicate){
    return this.predicate === predicate;
  });

  if(matchedPredicate.length === 0){
    return true;
  }



}
