module.exports = function(grunt) {

  grunt.initConfig({
    mocha_istanbul: {
      coverage: {
        src: ["test/**", "lib/**"], // load used folders
        options: {
          mask: '**/*.js',
          excludes: ["**/test/**", "**/rule-parser/**"], //we dont care about test coverage of our testing code
          print: "both", //prints both detailed and summary test data
          mochaOptions: ['--harmony'],
          istanbulOptions: ['--harmony', '--handle-sigint']
        }
      }
    },
    istanbul_check_coverage: {
      default: {
        options: {
          coverageFolder: 'coverage*', // will check both coverage folders and merge the coverage results
          check: {
            lines: 80,
            statements: 80
          }
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-mocha-istanbul');

  //grunt.registerTask('jshint', ['jshint:all']);
  grunt.registerTask('test', ['mocha_istanbul:coverage']);

};
