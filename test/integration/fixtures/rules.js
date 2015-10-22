
var parse = require("../../../index").parser.parse;

module.exports = [
  {
    id:"singleProvider",
    providers :{
      "test1":[]
    },
    updates:[
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "test" +
    "\n -> {test1} test(State) done")]
    ,
    expects:{
      "test1": ["test(State)", ["done"], [1]]
    }
  },
  {
    id: "multiProvider",
    providers :{
      "test1":[],
      "test2":[]
    },
    updates:[
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1},
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "{test2} test(State) start ->\n" +
    "test\n" +
    "-> {test1} test(State) done")]
    ,
    expects:{
      "test1": ["test(State)", ["done"], [1, 2]]
    }
  },
  {
    id: "multiResponse",
    providers :{
      "test1":[],
      "test2":[]
    },
    updates:[
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1},
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "{test2} test(State) start ->\n" +
    "test\n" +
    "-> {test1} test(State) done\n" +
    "-> {test2} test(State) over"
    )]
    ,
    expects:{
      "test1": ["test(State)", ["done"], [1, 2]],
      "test2": ["test(State)", ["over"], [1, 2]]
    }
  },
  {
    id: "multiProviderWithExists",
    providers :{
      "test1":[],
      "test2":["Test"]
    },
    updates:[
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2},
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "{Test:exists} test(State) start ->\n" +
    "test\n" +
    "-> {test1} test(State) done"
    )]
    ,
    expects:{
      "test1": ["test(State)", ["done"], [1, 2]]
    }
  },
  {
    id: "multiResponseWithExists",
    providers :{
      "test1":[],
      "test2":["Test"]
    },
    updates:[
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2},
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "{Test:exists} test(State) start ->\n" +
    "test\n" +
    "-> {test1} test(State) done\n" +
    "-> {Test:exists} test(State) over"
    )]
    ,
    expects:{
      "test1": ["test(State)", ["done"], [1, 2]],
      "test2": ["test(State)", ["over"], [1, 2]]
    }
  },
  {
    id: "multiProviderWithExistsWDistraction",
    providers :{
      "test1":[],
      "test3":["Test"],
      "test2":["Test"]
    },
    updates:[
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2},
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "{Test:exists} test(State) start ->\n" +
    "test\n" +
    "-> {test1} test(State) done"
    )]
    ,
    expects:{
      "test1": ["test(State)", ["done"], [1, 2]]
    }
  },
  {
    id: "multiProviderWithExistsRulesReversed",
    providers :{
      "test1":[],
      "test2":["Test"]
    },
    updates:[
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2},
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{Test:exists} test(State) start ->\n" +
    "{test1} test(State) start ->\n" +
    "test\n" +
    "-> {test1} test(State) done"
    )]
    ,
    expects:{
      "test1": ["test(State)", ["done"], [2, 1]] //Payload will be reversed
    }
  },
  {
    id: "multiProviderWithAll",
    providers :{
      "test1":[],
      "test2":["Test"],
      "test3":["Test"]
    },
    updates:[
      {provider:"test3", predicate:"test(State)", groundings:["start"], payload:2},
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2},
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "{Test:all} test(State) start ->\n" +
    "test\n" +
    "-> {test1} test(State) done"
    )],
    expects:{
      "test1": ["test(State)", ["done"], [1, [2,2]]]
    }
  },
  {
    id: "multiResponseWithAll",
    providers :{
      "test1":[],
      "test2":["Test"],
      "test3":["Test"]
    },
    updates:[
      {provider:"test3", predicate:"test(State)", groundings:["start"], payload:2},
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2},
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "{Test:all} test(State) start ->\n" +
    "test\n" +
    "-> {test1} test(State) done\n" +
    "-> {Test:all} test(State) over"
    )],
    expects:{
      "test1": ["test(State)", ["done"], [1, [2,2]]],
      "test2": ["test(State)", ["over"], [1, [2,2]]],
      "test3": ["test(State)", ["over"], [1, [2,2]]]
    }
  },
  {
    id:"singleThis",
    providers :{
      "test1":["Test"]
    },
    updates:[
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{Test:this} test(State) start ->\n" +
    "test" +
    "\n -> {test1} test(State) done")],
    expects:{
      "test1": ["test(State)", ["done"], [1]]
    }
  },
  {
    id:"singleThisRespose",
    providers :{
      "test1":["Test"]
    },
    updates:[
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1}
    ],
    rules:[parse("{Test:this} test(State) start ->\n" +
    "test" +
    "\n -> {Test:this} test(State) done")],
    expects:{
      "test1": ["test(State)", ["done"], [1]]
    }
  },
  {
    id:"multiRuleSingleProvider",
    providers :{
      "test1":[],
      "test2":[]
    },
    updates:[
      {provider:"test1", predicate:"test(State)", groundings:["start"], payload:1},
      {provider:"test2", predicate:"test(State)", groundings:["start"], payload:2}
    ],
    rules:[parse("{test1} test(State) start ->\n" +
    "test" +
    "\n -> {test1} test(State) done"),
    parse("{test2} test(State) start ->\n" +
    "test2" +
    "\n -> {test2} test(State) done")
    ],
    expects:{
      "test1": ["test(State)", ["done"], [1]],
      "test2": ["test(State)", ["done"], [2]]
    }
  },
]
