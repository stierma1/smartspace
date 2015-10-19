
var Graph = require("graphtastic").Graph;
var Facts = require("./facts");
var wrapper = require("./graph-wrapper");
var Query = require("./query");

function Application(config, initGraph, initFacts){
  this.config = config;
  this.graph = wrapper(Graph.CreateGraph());
  this.facts = new Facts();
  this.providerHandlers = {};
}

Application.prototype.updateProvider = function(updateObj){
  var query = new Query(this.graph, this.facts, updateObj.provider, updateObj.predicate, updateObj.groundings);
  if(query.hasProviderStateChanged()){
    this.facts.update(updateObj.provider, updateObj.predicate, updateObj.groundings, updateObj.payload);
    var satRules = query.execute();

    for(var i = 0; i < satRules.length; i++){
      var payload = query.getPayload(satRules[i]);
      var providers = query.getOutputProviders(satRules[i]);

      for(var j = 0; j < providers.length; j++){
        var handler = this.providerHandlers[providers[j].provider];
        if(handler){
          handler(providers[j].predicate, providers[j].groundings, payload);
        }
      }
    }

  }
}

Application.prototype.addProvider = function(providerObj, updateHandler){
  this.graph.addProvider(providerObj.id, providerObj.classes);
  this.providerHandlers[providerObj.id] = updateHandler;
}

Application.prototype.addRule = function(ruleObj){
  this.graph.addRule(ruleObj.id, ruleObj.inputContexts, ruleObj.outputContexts);
}

module.exports = Application;
