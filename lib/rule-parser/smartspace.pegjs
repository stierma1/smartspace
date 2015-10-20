
{function cleanGroundings(groundings){
  var first = groundings[0];
  var tail = groundings[1];
  var result = [first];
  if(tail){
    for(var i = 0; i < tail.length; i++){
      result.push(tail[i][1]);
    }
  }
  return result;
}
}

 RuleBody
   = inCtxRules:(InputContextRule whitespace "->" whitespace)+ whitespace rule:RuleId whitespace outCtxRules:( whitespace "->" whitespace OutputContextRule)+ {
     var result = {}, i;
     result.id = rule;
     result.inputCtxRules = inCtxRules.reduce(function(red, val){red.push(val[0]); return red;}, []);
     result.outputCtxRules = outCtxRules.reduce(function(red, val){red.push(val[3]); return red;}, []);

     return result;
   }

 whitespace
   = [ \t\n\r]* {return ""}

 InputContextRule
  = providerSig:ProviderSignifier whitespace predicateSignature:PredicateSignature whitespace groundings:(Grounding ("," Grounding)*) {
    return {
      provider: providerSig,
      predicate: predicateSignature,
      groundings: cleanGroundings(groundings)
    }
  }

 OutputContextRule
  = providerSig:ProviderSignifier whitespace predicateSignature:PredicateSignature whitespace groundings:(Grounding ("," Grounding)*) {
    return {
      provider: providerSig,
      predicate: predicateSignature,
      groundings: cleanGroundings(groundings)
    }
  }

 ProviderSignifier
  = "{" whitespace assoc:AssociationVar whitespace "}" {
    return assoc;
  } / "{" provId:ProviderId "}" {
    return provId;
  }

 ProviderId
 = provId:String {
  return {
    provider:provId
  };
 }

 AssociationVar
  = assoc:String ":" instanceVar:Quantifier {
    return {
      class: assoc,
      quantifier: instanceVar
    };
  }

 Grounding "grounding"
  = String

 PredicateSignature "PredicateSignature"
  = String "(" String ("," String)* ")" {return text();}

 RuleId
  = String

 String
  = [0-9A-Za-z\-_]+ {return text();}

 Quantifier
  = "exists" {return text();} / "all" {return text();} / "this" {return text();}
