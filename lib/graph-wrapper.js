var uuid = require("uuid");

function getNodeByEdge(id, edgeLabel){
  return this.GetEdges(id).filter(function(edge){
    return edge && edge.data.label && edge.data.label === edgeLabel;
  }).map(function(edge){
    return edge.to.label;
  });
}

function addProvider(id, classes){
  this.tryAddVertex("provider/" + id, {value:id});
  for(var i in classes){
    this.tryAddVertex("class/" + classes[i], {value:classes[i]});
    this.AddEdge("provider/" + id, "class/" + classes[i], {label:"is_a"});
    this.AddEdge("class/" + classes[i], "provider/" + id,  {label:"classifies"});
  }
}

function addCtxRule(ruleId, provider, predicate, groundings, idx){
  var isClass = !!provider.class;
  var id = uuid.v4();

  if(isClass){
    this.tryAddVertex("class/" + provider.class, {value:provider.class});
  } else {
    this.tryAddVertex("provider/" + provider.provider, {value:provider.provider});
  }
  this.tryAddVertex("predicate/" + predicate, {value:predicate});
  for(var i in groundings){
    this.tryAddVertex("grounding/" + groundings[i], {value:groundings[i]});
  }
  this.AddVertex(id, {id:id, provider:provider, predicate:predicate, groundings:groundings, idx:idx});

  this.AddEdge("rule/" + ruleId, id, {label:"rule_element"});
  this.AddEdge(id, "rule/" + ruleId, {label:"element_of"});
  if(isClass){
    this.AddEdge("class/" + provider.class, id, {label:"provider"});
    this.AddEdge(id, "class/" + provider.class, {label:"provider_back"});
  } else {
    this.AddEdge("provider/" + provider.provider, id, {label:"provider"});
    this.AddEdge(id, "provider/" + provider.provider, {label:"provider_back"});
  }
  this.AddEdge("predicate/" + predicate, id, {label:"predicates"});
  this.AddEdge(id, "predicate/" + predicate, {label:"predicates_back"});

  for(var i in groundings){
    this.AddEdge("grounding/" + groundings[i], id, {label:"grounds"});
    this.AddEdge(id, "grounding/" + groundings[i], {label:"grounds_back"});
  }
}

function addOutCtxRule(ruleId, provider, predicate, groundings, idx){
  var isClass = !!provider.class;
  var id = uuid.v4();

  if(isClass){
    this.tryAddVertex("class/" + provider.class, {value:provider.class});
  } else {
    this.tryAddVertex("provider/" + provider.provider, {value:provider.provider});
  }
  this.tryAddVertex("predicate/" + predicate, {value:predicate});

  this.AddVertex(id, {id:id, provider:provider, predicate:predicate, groundings:groundings, idx:idx});

  for(var i in groundings){
    this.tryAddVertex("grounding/" + groundings[i], {value:groundings[i]});
  }

  this.AddEdge("rule/" + ruleId, id, {label:"action_element"});
  this.AddEdge(id, "rule/" + ruleId, {label:"action_of"});
  if(isClass){
    this.AddEdge("class/" + provider.class, id, {label:"emitter"});
    this.AddEdge(id, "class/" + provider.class, {label:"emitter_back"});
  } else {
    this.AddEdge("provider/" + provider.provider, id, {label:"emitter"});
    this.AddEdge(id, "provider/" + provider.provider, {label:"emitter_back"});
  }
  this.AddEdge("predicate/" + predicate, id, {label:"predicates"});
  this.AddEdge(id, "predicate/" + predicate, {label:"predicates_back"});
  for(var i in groundings){
    this.AddEdge("grounding/" + groundings[i], id, {label:"grounds"});
    this.AddEdge(id, "grounding/" + groundings[i], {label:"grounds_back"});
  }
}

function addRule(ruleId, inputContexts, outputContexts){
  if(!!this.tryGetVertex("rule/" + ruleId)){
    this.removeRule(ruleId);
  }

  this.AddVertex("rule/" + ruleId, {value:ruleId});
  for(var i in inputContexts){
    var iCtx = inputContexts[i];
    this.addCtxRule(ruleId, iCtx.provider, iCtx.predicate, iCtx.groundings, i);
  }
  for(var i in outputContexts){
    var oCtx = outputContexts[i];
    this.addOutCtxRule(ruleId, oCtx.provider, oCtx.predicate, oCtx.groundings, i);
  }
}

function hasRule(ruleId){
  return !!this.tryGetVertex("rule/" + ruleId);
}

function removeRule(ruleId){
  var self = this;

  var inCtxRules = this.getNodeByEdge("rule/" + ruleId, "rule_element").map(function(ctxRule){
    self.RemoveVertex(ctxRule);
  });
  var outCtxRules = this.getNodeByEdge("rule/" + ruleId, "action_element").map(function(ctxRule){
    self.RemoveVertex(ctxRule);
  });
  self.RemoveVertex("rule/" + ruleId);
}

function removeTypeLabel(label){
  return label.split("/")[1];
}

function toJson(){
  var self = this;
  var rulePrefix = /^rule\/.+/;
  var ruleVerts = this.vertexCollection.filter(function(vert){
    return rulePrefix.test(vert.label);
  });

  return ruleVerts.map(function(vert){

    var result = {id:removeTypeLabel(vert.label), inputCtxRules:[], outputCtxRules:[]};
    var inCtxRules = self.getNodeByEdge(vert.label, "rule_element");

    result.inputCtxRules = inCtxRules.map(function(inCtxid){
      var inCtxContents = self.GetVertex(inCtxid);
      return {
        provider: inCtxContents.data.provider,
        predicate: inCtxContents.data.predicate,
        groundings: inCtxContents.data.groundings
      };
    });

    var outCtxRules = self.getNodeByEdge(vert.label, "action_element");
    result.outputCtxRules = outCtxRules.map(function(outCtxid){
      var outCtxContents = self.GetVertex(outCtxid);
      return {
        provider: outCtxContents.data.provider,
        predicate: outCtxContents.data.predicate,
        groundings: outCtxContents.data.groundings
      };
    });

    return result;
  });
}

function addClass(providerId, classId){
  this.tryAddVertex("class/" + classId);
  this.tryAddVertex("provider/" + providerId);
  this.AddEdge("class/" + classId, providerId, {label:"classifies"});
  this.AddEdge(providerId, "class/" + classId, {label:"is_a"});
}

function removeClass(provider, classId){
  this.DeleteEdgeGroup("provider/" + provider, "class/" + classId);
}

module.exports = function(graph){
  graph.getNodeByEdge = getNodeByEdge.bind(graph);
  graph.addCtxRule = addCtxRule.bind(graph);
  graph.addOutCtxRule = addOutCtxRule.bind(graph);
  graph.addRule = addRule.bind(graph);
  graph.addProvider = addProvider.bind(graph);
  graph.removeRule = removeRule.bind(graph);
  graph.hasRule = hasRule.bind(graph);
  graph.toJson = toJson.bind(graph);
  graph.addClass = addClass.bind(graph);
  graph.removeClass = removeClass.bind(graph);
  return graph;
}
