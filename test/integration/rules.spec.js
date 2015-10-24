var smartspace = require("../../index");
var tests = require("./fixtures/rules");
var chai = require("chai");
var Bluebird = require("bluebird");
var parse = smartspace.parser.parse;
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
  });

  it("no response expected when no rule", function(done){
    setTimeout(function(){done()}, 100);
    var application = new smartspace.Application({logLevel:"silent"});
    application.addProvider({id:"test", classes:[]}, function(){done(new Error("should not have happened"))});
    application.updateProvider({provider:"test", predicate:"stop(True)", groundings:["true"]});
  });

  it("no response expected when no matching predicate", function(done){
    setTimeout(function(){done()}, 100);
    var application = new smartspace.Application({logLevel:"silent"});
    application.addProvider({id:"test", classes:[]}, function(){done(new Error("should not have happened"))});
    application.addRule(parse("{test1} test(State) start ->\n" +
    "test" +
    "\n -> {test1} test(State) done"));
    application.updateProvider({provider:"test", predicate:"stop(True)", groundings:["true"]});
  });

  it("should not double fire", function(done){
    var fired = false;
    setTimeout(function(){
      done()
    }, 100);
    var application = new smartspace.Application({logLevel:"silent"});
    application.addProvider({id:"test", classes:[]}, function(){
      if(fired)
        done(new Error("should not have happened"))
      else
        fired = true;
    });
    application.addRule(parse("{test} test(State) start ->\n" +
    "test" +
    "\n -> {test} test(State) done"));
    application.updateProvider({provider:"test", predicate:"test(State)", groundings:["start"]});
    application.updateProvider({provider:"test", predicate:"test(State)", groundings:["start"]});
  });

  it("should remove rule", function(done){
    setTimeout(function(){
      done();
    }, 100);
    var application = new smartspace.Application({logLevel:"silent"});
    application.addProvider({id:"test", classes:[]}, function(){
      done(new Error("should not have happened"))
    });

    application.addRule(parse("{test} test(State) start ->\n" +
    "test" +
    "\n -> {test} test(State) done"));
    application.removeRule("test");
    application.updateProvider({provider:"test", predicate:"test(State)", groundings:["start"]});
  });

  it("should serialize to Json", function(done){
    var application = new smartspace.Application({logLevel:"silent"});
    var parsed = parse("{test} test(State) start ->\n" +
    "test" +
    "\n -> {test} test(State) done");
    application.addRule(parsed);
    var serialize = JSON.parse(application.serializeRules());
    serialize.should.have.property("length").equals(1);
    parsed.id.should.equal(serialize[0].id);
    parsed.inputCtxRules[0].provider.provider.should.equal(serialize[0].inputCtxRules[0].provider.provider);
    parsed.outputCtxRules[0].provider.provider.should.equal(serialize[0].outputCtxRules[0].provider.provider);
    JSON.stringify(parsed).should.equal(JSON.stringify(serialize[0]));
    done();
  });
});
