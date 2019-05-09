var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    seleniumAddress: 'http://localhost:4444/wd/hub',
    baseUrl: 'http://automate.safebear.co.uk:8080',

    capabilities: {
        'browserName': 'chrome'
      },

    //   multiCapabilities: [{
    //     'browserName': 'firefox'
    //   }, {
    //     'browserName': 'chrome'
    //   }]  

    // capabilities: {
    //     browserName: 'chrome',
      
    //     chromeOptions: {
    //        args: [ "--headless", "--disable-gpu", "--window-size=800,600" ]
    //      }
    //   }

    // run a group of tests
    specs: ['products/*.spec.js'],
    suites: {
         products: 'products/*.spec.js'
    },

    framework: 'jasmine',
    onPrepare: function() {
        // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
        jasmine.getEnv().addReporter(new HtmlReporter({
           baseDirectory: 'tmp/screenshots',
           docTitle: 'Products Report'
        }).getJasmine2Reporter());
    }
};
