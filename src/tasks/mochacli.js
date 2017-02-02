/**
 * @author kecso / https://github.com/kecso
 */

/*
 This module is a small script that allows the user to execute tests in mocha
 and get the results in a JSON object.
 */
var Mocha = require('mocha'),
    files = [],
    FS = require('fs'),
    PATH = require('path'),
    Q = require('q'),
    resultDir,
    sourcedir;

function getTestName(test) {
    var name = '';

    while (test && test.title) {
        name = test.title + (name.length ? ' : ' + name : '');
        test = test.parent;
    }

    return name;
}

function addFile(path) {
    files.push(path);
}

function addDir(path, excludeUpmostLevel) {
    // Recursively adds all js files to the suite. If excludeUpmostLevel === true, then
    // it leaves out js files on the initial directory
    var list = FS.readdirSync(path),
        i, stat, subPath;
    if (excludeUpmostLevel !== false) {
        excludeUpmostLevel = true;
    }
    for (i = 0; i < list.length; i += 1) {
        subPath = PATH.join(path, list[i]);
        stat = FS.statSync(subPath);
        if (stat.isDirectory()) {
            addDir(subPath, false);
        } else if (stat.isFile() && excludeUpmostLevel === false && PATH.parse(subPath).ext === '.js') {
            addFile(subPath);
        }
    }
}

function clearFiles() {
    files = [];
}

function run(workingDir) {
    var deferred = Q.defer(),
        mocha = new Mocha({}),
        i,
        originalWorkingDir = process.cwd(),
        runner,
        stats = {
            all: 0,
            pass: 0,
            fail: 0,
            pending: 0,
            more: {}
        },
        oldStdout = process.stdout.write,
        oldStderr = process.stderr.write;

    process.stdout.write = function (string, encoding, fd) {
        //just ignore everything
    };

    process.stderr.write = function (string, encoding, fd) {
        //just ignore everything
    };

    for (i = 0; i < files.length; i += 1) {
        mocha.addFile(files[i]);
    }

    if (workingDir) {
        process.chdir(workingDir);
    }

    runner = mocha.run();

    runner.on('pass', function (test) {
        stats.pass += 1;
        stats.all += 1;
    });
    runner.on('fail', function (test, err) {
        stats.more.failedTests = stats.more.failedTests || {};
        stats.more.failedTests[getTestName(test)] = err;
        stats.fail += 1;
        stats.all += 1;
    });
    runner.on('pending', function (test) {
        stats.more.pendingTests = stats.more.pendingTests || [];
        stats.more.pendingTests.push(getTestName(test));
        stats.pending += 1;
        stats.all += 1;
    });
    runner.on('end', function () {
        process.stdout.write = oldStdout;
        process.stderr.write = oldStderr;
        process.chdir(originalWorkingDir);
        deferred.resolve(stats);
    });

    return deferred.promise;
}

//here starts the functionality
resultDir = process.argv[2] || './';
clearFiles();
console.log('cleared');
addDir(process.argv[3] || './', true);
console.log('added');
run()
    .then(function (result) {
        console.log(result);
        FS.writeFileSync(resultDir + '/mochaResults.json', JSON.stringify(result || {}, null, 2));
        process.exit(0);
    })
    .catch(function (err) {
        console.log(err);
        process.exit(1);
    });