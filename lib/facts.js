function Facts(init){
  this.facts = init || {};
}

Facts.prototype.getGroundings = function(providerId, predicate){
  return this.facts[providerId] && this.facts[providerId][predicate];
}

Facts.prototype.update = function(providerId, predicate, groundings){
  this.facts[providerId] = this.facts[providerId] || {};
  this.facts[providerId][predicate] = groundings;
}

module.exports = Facts;
