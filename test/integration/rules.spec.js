var smartspace = require("../../index");
var tests = require("./fixtures/rules");
var chai = require("chai");
var Bluebird = require("bluebird");
chai.should();

describe("integration", function(){
  tests.forEach(function(test){
    var i = test.id;
    it(i, function(done){
      var application = new smartspace.Application({logLevel:"silent"});

      for(var j in test.rules){
        application.addRule(test.rules[j]);
      }
      var expectations = {};

      for(var j in test.expects){
        var e = function(id, value){
          var defer = Bluebird.defer();
          return {handler:function(predicate, groundings, payload){
            if(value[0] === predicate && JSON.stringify(payload) === JSON.stringify(value[2])){
              for(var s in groundings){
                if(groundings[s] !== value[1][s]){
                  defer.reject(new Error("Groundings missmatch " + id));
                  return
                }
              }
              defer.resolve();
              return;
            }
            defer.reject(new Error("Response missmatch " + id));
          }, promise:defer.promise}
        }(j, test.expects[j]);
        expectations[j] = e;

      }

      for(var j in test.providers){
        application.addProvider({id:j, classes:test.providers[j]}, expectations[j] && expectations[j].handler);
      }

      var promises = [];
      for(var j in expectations){
        promises.push(expectations[j].promise);
      }

      Bluebird.all(promises).then(function(){
        done();
      }).catch(function(err){
        done(err)
      });
      for(var j in test.updates){
        application.updateProvider(test.updates[j]);
      }
    })
  })
});
