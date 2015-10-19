function Facts(init){
  this.facts = init || {};
}

Facts.prototype.getGroundings = function(providerId, predicate){
  return this.facts[providerId] && this.facts[providerId][predicate];
}

Facts.prototype.update = function(providerId, predicate, groundings, payload){
  this.facts[providerId] = this.facts[providerId] || {};
  this.facts[providerId][predicate] = {groundings:groundings, payload:payload};
}

Facts.prototype.matchExists = function(providerId, predicate, groundings){
  var groundingsCandidate = this.getGroundings(providerId, predicate);
  if(groundingsCandidate){
    groundingsCandidate = groundingsCandidate.groundings;
  }
  var self = this;

  var groundingsMatch = !!groundingsCandidate && groundingsCandidate.reduce(function(red, val, idx){
    return red && (groundings[idx] === "_" || val === groundings[idx]);
  }, true);

  return groundingsMatch;
}

Facts.prototype.getPayload = function(providerId, predicate){
  return this.getGroundings(providerId, predicate).payload;
}

module.exports = Facts;
