/**
 * @author kecso / https://github.com/kecso
 */
var workDir = '/webgme',
    baseDir = process.cwd(),
    resultDir = '/results',
    resultId = null,
    exec = require('child_process').exec,
    Q = require('q'),
    fs = require('fs-extra'),
    mocha = require(baseDir + '/src/tasks/mocha'),
    istanbul = require(baseDir + '/src/tasks/istanbul'),
    buildTime = {},
    logFile = baseDir + resultDir + '/execution.log',
    globals,
    detailed;

if (process.argv.length === 3) {
    resultId = process.argv[2];
    resultDir += '/' + resultId;
}

// used functions
function LOG(text) {
    if (logFile) {
        text = '[' + new Date().toISOString() + '] [' + resultId + '] ' + text + '\n';
        fs.appendFileSync(logFile, text);
    }
}

function initGlobals() {
    var directories,
        deferred = Q.defer();

    LOG('init-globals task start');
    try {
        globals = JSON.parse(fs.readFileSync(baseDir + '/results/globals.json'));
    } catch (e) {
        LOG('globals are not yet created');
    } finally {
        globals = globals || {
                commits: [],
                histograms: {
                    coverage: [],
                    coverageTime: [],
                    mocha: [],
                    mochaTime: [],
                    npmTime: [],
                    gitTime: [],
                    performanceTime: []
                },
                detailed: {}
            };
    }

    directories = fs.readdirSync(baseDir + '/results');
    if (directories.indexOf(resultId) !== -1) {
        throw new Error('commit hash was already processed!');
    }

    fs.mkdirSync(baseDir + resultDir);
    globals.detailed[resultId] = {};
    detailed = globals.detailed[resultId];
    globals.commits.unshift(resultId);

    LOG('init-globals task end');

    deferred.resolve();
    return deferred.promise;
}

function saveGlobals() {
    var time,
        deferred = Q.defer();

    LOG('save-globals task start');
    detailed.buildTime = buildTime;
    for (time in buildTime) {
        globals.histograms[time + 'Time'].unshift(buildTime[time]);
    }
    fs.writeFileSync(baseDir + '/results/globals.json', JSON.stringify(globals, null, 2));

    LOG('save-globals task end');

    deferred.resolve();
    return deferred.promise;
}

function executeCommand(cmd, cwd, ignoring) {
    var deferred = Q.defer(),
        task;

    task = exec(cmd, {cwd: cwd, encoding: 'buffer'});
    task.stdout.on('data', function (data) {

    });
    task.stderr.on('data', function (data) {

    });
    task.on('close', function (code) {
        if (ignoring) {
            deferred.resolve();
        } else if (code !== null && code !== 0) {
            deferred.reject(new Error('execution of [' + cmd + '] failed with code:' + code));
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function git() {
    var deferred = Q.defer();

    LOG('git task start');
    buildTime.git = new Date().getTime();
    executeCommand('git reset --hard', baseDir + workDir)
        .then(function () {
            return executeCommand('git fetch --all', baseDir + workDir);
        })
        .then(function () {
            return executeCommand('git checkout --detach ' + resultId, baseDir + workDir);
        })
        .then(function () {
            LOG('git task end');
            buildTime.git = new Date().getTime() - buildTime.git;
            deferred.resolve();
        })
        .catch(function (e) {
            buildTime.git = null;
            deferred.reject(e);
        });

    return deferred.promise;
}

function npm() {
    var deferred = Q.defer();

    LOG('npm task start');
    buildTime.npm = new Date().getTime();

    executeCommand('npm install', baseDir + workDir)
        .then(function () {
            LOG('npm task end');
            buildTime.npm = new Date().getTime() - buildTime.npm;
            deferred.resolve();
        })
        .catch(function (e) {
            buildTime.npm = null;
            deferred.reject(e);
        });

    return deferred.promise;
}

function mochaTests() {
    var deferred = Q.defer();

    LOG('mocha task start');
    buildTime.mocha = new Date().getTime();
    executeCommand('node ' + baseDir + '/src/tasks/mochacli.js ' + baseDir + resultDir + ' ' +
        baseDir + workDir + '/test', baseDir + workDir)
        .then(function () {
            var mochaResults;

            LOG('mocha task end');
            buildTime.mocha = new Date().getTime() - buildTime.mocha;

            mochaResults = JSON.parse(fs.readFileSync(baseDir + resultDir + '/mochaResults.json', 'utf8'));
            globals.histograms.mocha.unshift(
                parseInt(100 * (mochaResults.pass / (mochaResults.all - mochaResults.pending)))
            );

            deferred.resolve();
        })
        .catch(function (e) {
            buildTime.mocha = null;
            deferred.reject(e);
        });

    return deferred.promise;
}

function coverage() {
    var deferred = Q.defer();
    LOG('coverage task start');
    buildTime.coverage = new Date().getTime();
    fs.emptyDirSync(baseDir + workDir + '/coverage');
    executeCommand('node ./node_modules/istanbul/lib/cli.js ' +
        '--hook-run-in-context cover node_modules/mocha/bin/_mocha ' +
        '-- -R min --timeout 10000 --recursive test',
        baseDir + workDir, true)
        .then(function () {
            LOG('coverage task end');
            buildTime.coverage = new Date().getTime() - buildTime.coverage;
            fs.copySync(baseDir + workDir + '/coverage', baseDir + resultDir + '/coverage');
            deferred.resolve();

        })
        .catch(function (e) {
            buildTime.coverage = null;
            deferred.reject(e);
        });

    return deferred.promise;
}

function processCoverage() {
    var deferred = Q.defer();

    LOG('process-coverage task start');
    try {
        var coverageInfo = istanbul(baseDir + workDir, baseDir + resultDir + '/coverage/coverage.json');
        globals.histograms.coverage.unshift(coverageInfo.__total__.lines.pct);
    } catch (e) {
        //TODO right now we ignore error
        LOG('process-coverage task internal error -> ' + e);
        globals.histograms.coverage.unshift(0);
    }
    LOG('process-coverage task end');
    deferred.resolve();

    return deferred.promise;
}

//here starts the actual call of functions
LOG('task sequence running start');

initGlobals()
    .then(function () {
        return git();
    })
    .then(function () {
        return npm();
    })
    .then(function () {
        return mochaTests();
    })
    .then(function () {
        return coverage();
    })
    .then(function () {
        return processCoverage();
    })
    .then(function () {
        return saveGlobals();
    })
    .then(function () {
        LOG('task sequence running end');
        process.exit(0);
    })
    .catch(function (e) {
        console.error(e);
        process.exit(1);
    });