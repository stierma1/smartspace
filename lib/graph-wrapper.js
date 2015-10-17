var uuid = require("uuid");

function getNodeByEdge(id, edgeLabel){
  return this.GetEdges(id).filter(function(edge){
    return edge && edge.data.label && edge.data.label === edgeLabel;
  }).map(function(edge){
    return edge.to.label;
  });
}

function addCtxRule(ruleId, provider, predicate, groundings){
  var isClass = !!provider.class;
  var id = uuid.v4();

  if(isClass){
    this.AddVertex("class/" + provider.class, {value:provider.class});
  } else {
    this.AddVertex("provider/" + provider.provider, {value:provider.provider});
  }
  this.AddVertex("predicate/" + predicate, {value:predicate});
  for(var i in groundings){
    this.AddVertex("grounding/" + groundings[i], {value:groundings[i]});
  }
  this.AddVertex(id, {id:id, provider:provider, predicate:predicate, groundings:groundings});

  this.AddEdge("rule/" + ruleId, id, {label:"rule_element"});
  this.AddEdge(id, "rule/" + ruleId, {label:"element_of"});
  if(isClass){
    this.AddEdge("class/" + provider.class, id, {label:"provider"});
    this.AddEdge(id, "class/" + provider.class, {label:"provider_back"});
  } else {
    this.AddVertex("provider/" + provider.provider, id, {label:"provider"});
    this.AddVertex(id,, "provider/" + provider.provider, {label:"provider_back"});
  }
  this.AddEdge("predicate/" + predicate, id, {label:"predicates"});
  this.AddEdge(id, "predicate/" + predicate, {label:"predicates_back"});

  for(var i in groundings){
    this.AddEdge("grounding/" + groundings[i], id, {label:"grounds"});
    this.AddEdge(id, "grounding/" + groundings[i], {label:"grounds_back"});
  }
}

function addRule(ruleId, inputContexts){
  this.AddVertex("rule/" + ruleId, {value:ruleId});
  for(var i in inputContexts){
    var iCtx = inputContexts[i];
    this.addCtxRule(ruleId, iCtx.provider, iCtx.predicate, iCtx.groundings);
  }
}

module.exports = function(graph){
  graph.getNodeByEdge = getNodeByEdge.bind(graph);
  graph.addCtxRule = addCtxRule.bind(graph);
  return graph;
}
