
function getNodeByEdge(id, edgeLabel){
  return this.GetEdges(id).filter(function(edge){
    return edge && edge.data.label && edge.data.label === edgeLabel;
  }).map(function(edge){
    return edge.to.label;
  });
}

module.exports = function(graph){
  graph.getNodeByEdge = getNodeByEdge.bind(this);
}
