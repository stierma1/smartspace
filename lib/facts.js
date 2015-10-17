function Facts(init, history){
  this.facts = init || {};
  this.ctxHistory = history || {};
}

Facts.prototype.getGroundings = function(providerId, predicate){
  return this.facts[providerId] && this.facts[providerId][predicate];
}

Facts.prototype.update = function(providerId, predicate, groundings){
  this.facts[providerId] = this.facts[providerId] || {};
  this.facts[providerId][predicate] = groundings;
}

Facts.prototype.matchExists = function(providerId, predicate, groundings){
  var groundingsCandidate = this.getGroundings(providerId, predicate);
  var self = this;

  var groundingsMatch = !!groundingsCandidate && groundingsCandidate.reduce(function(red, val, idx){
    return red && (groundings[idx] === "_" || val === groundings[idx]);
  }, true);

  return groundingsMatch;
}

Facts.prototype.hasSatisfiedRulePreviously = function(provider, ctxId){
  return !!this.ctxHistory[provider] && !!this.ctxHistory[provider][ctxId];
}

module.exports = Facts;
