var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "should create a product",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "aee35010aa7f00ae54f1fc508ff50f65",
        "instanceId": 10849,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.131"
        },
        "message": [
            "Failed: Angular could not be found on the page http://localhost:8080/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load",
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Angular could not be found on the page http://localhost:8080/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at executeAsyncScript_.then (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/browser.js:720:27)\n    at ManagedPromise.invokeCallback_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\n    at Spec.queueRunnerFactory (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:909:35)\n    at Spec.execute (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:526:10)\n    at UserContext.fn (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:5340:37)\n    at attempt (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at QueueRunner.execute (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4199:10)\nFrom asynchronous test: \nError\n    at Object.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:5:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)\n    at Function.Module._load (module.js:498:3)\n    at Module.require (module.js:597:17)\n    at require (internal/module.js:11:18)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine/lib/jasmine.js:93:5",
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:13:25)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create a product\") in control flow\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Object.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:9:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)\n    at Function.Module._load (module.js:498:3)\n    at Module.require (module.js:597:17)\n    at require (internal/module.js:11:18)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine/lib/jasmine.js:93:5"
        ],
        "browserLogs": [],
        "screenShotFile": "00fe0055-00d7-00f3-0034-00c800aa00f1.png",
        "timestamp": 1557435884026,
        "duration": 10412
    },
    {
        "description": "should create a product",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "d38a2c170224e0c3adbc9b9d0fc81427",
        "instanceId": 11872,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.131"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"h2\", \"turbot\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"h2\", \"turbot\")\n    at elementArrayFinder.getWebElements.then (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:24:57)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create a product\") in control flow\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Object.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:9:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)\n    at Function.Module._load (module.js:498:3)\n    at Module.require (module.js:597:17)\n    at require (internal/module.js:11:18)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine/lib/jasmine.js:93:5"
        ],
        "browserLogs": [],
        "screenShotFile": "003300bd-0051-00dd-002d-00fc00890016.png",
        "timestamp": 1557436474279,
        "duration": 7057
    },
    {
        "description": "should create a productmeat|productTests",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "e83a7020287f8151d812640f10388f0f",
        "instanceId": 13302,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.131"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"h2\", \"sausages\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"h2\", \"sausages\")\n    at elementArrayFinder.getWebElements.then (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:34:51)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create a productmeat\") in control flow\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at /home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:17:5\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-data-provider/src/index.js:37:22\n    at Array.forEach (<anonymous>)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-data-provider/src/index.js:30:24\n    at Suite.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:16:3)\n    at addSpecsToSuite (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "00da0052-00ca-00a1-00a4-00a7004200cf.png",
        "timestamp": 1557437325963,
        "duration": 7126
    },
    {
        "description": "should create a productmeat|productTests",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "7411ca00ff3f466c4189a66d263bdab5",
        "instanceId": 13770,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.131"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"body > app-root > div.container > app-product-detail > div > mat-card > mat-card-header > div > mat-card-title\", \"sausages\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"body > app-root > div.container > app-product-detail > div > mat-card > mat-card-header > div > mat-card-title\", \"sausages\")\n    at elementArrayFinder.getWebElements.then (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:34:51)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create a productmeat\") in control flow\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at /home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:17:5\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-data-provider/src/index.js:37:22\n    at Array.forEach (<anonymous>)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-data-provider/src/index.js:30:24\n    at Suite.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:16:3)\n    at addSpecsToSuite (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "0039006c-00ca-00ad-005b-00eb00430030.png",
        "timestamp": 1557437618240,
        "duration": 10916
    },
    {
        "description": "should create a productmeat|productTests",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "710cc85158d363ec87b1bdb77ce07b77",
        "instanceId": 14065,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.131"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"body > app-root > div.container > app-product-detail > div > mat-card > mat-card-header > div > mat-card-title\", \"sausages\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"body > app-root > div.container > app-product-detail > div > mat-card > mat-card-header > div > mat-card-title\", \"sausages\")\n    at elementArrayFinder.getWebElements.then (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:34:51)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create a productmeat\") in control flow\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at /home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:17:5\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-data-provider/src/index.js:37:22\n    at Array.forEach (<anonymous>)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-data-provider/src/index.js:30:24\n    at Suite.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:16:3)\n    at addSpecsToSuite (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "0037007b-006e-00a0-0070-00dc00e900c4.png",
        "timestamp": 1557437723771,
        "duration": 7182
    },
    {
        "description": "should create a productmeat|productTests",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "25af748a61bc0fc826e484785ab2616b",
        "instanceId": 15325,
        "browser": {
            "name": "chrome",
            "version": "74.0.3729.131"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"body\", \"sausages\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"body\", \"sausages\")\n    at elementArrayFinder.getWebElements.then (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (/home/fishdev/Projects/cap-pro/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:34:51)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"should create a productmeat\") in control flow\n    at UserContext.<anonymous> (/home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/fishdev/Projects/cap-pro/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/fishdev/Projects/cap-pro/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at /home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:17:5\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-data-provider/src/index.js:37:22\n    at Array.forEach (<anonymous>)\n    at /home/fishdev/Projects/cap-pro/node_modules/jasmine-data-provider/src/index.js:30:24\n    at Suite.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:16:3)\n    at addSpecsToSuite (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/fishdev/Projects/cap-pro/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/fishdev/Projects/cap-pro/test/products/products_crud.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f200db-0027-005b-00a3-003300ec001a.png",
        "timestamp": 1557438241111,
        "duration": 6510
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

