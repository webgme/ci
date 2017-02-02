/**
 * @author kecso / https://github.com/kecso
 */
var workDir = '/webgme',
    baseDir = process.cwd(),
    resultDir = '/results',
    resultId = null,
    gulp = require('gulp'),
    exec = require('child_process').exec,
    git = require('gulp-git'),
    Q = require('q'),
    fs = require('fs-extra'),
    mocha = require(baseDir + '/src/tasks/mocha'),
    istanbul = require(baseDir + '/src/tasks/istanbul'),
    buildTime = {},
    logFile = baseDir + resultDir + '/execution.log',
    runSequence = require('run-sequence').use(gulp),
    globals,
    detailed;

if (process.argv.length === 3) {
    resultId = process.argv[2];
    resultDir += '/' + resultId;
}

function LOG(text) {
    if (logFile) {
        text = '[' + new Date().toISOString() + '] [' + resultId + '] ' + text + '\n';
        fs.appendFileSync(logFile, text);
    }
}

gulp.task('init-globals', function () {
    var directories;

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
});

gulp.task('save-globals', function () {
    var time;

    LOG('save-globals task start');
    detailed.buildTime = buildTime;
    for (time in buildTime) {
        globals.histograms[time + 'Time'].unshift(buildTime[time]);
    }
    fs.writeFileSync(baseDir + '/results/globals.json', JSON.stringify(globals, null, 2));

    LOG('save-globals task end');
});

if (resultId) {
    gulp.task('git', function () {
        var deferred = Q.defer();

        LOG('git task start');
        buildTime.git = new Date().getTime();
        git.fetch('', '', {args: '--all', cwd: '.' + workDir}, function (err) {
            if (err) {
                buildTime.git = null;
                deferred.reject(err);
            } else {
                git.exec({args: 'reset --hard', cwd: '.' + workDir}, function (err) {
                    if (err) {
                        buildTime.git = null;
                        deferred.reject(err);
                    } else {
                        git.exec({args: 'checkout --detach ' + resultId, cwd: '.' + workDir}, function (err) {
                            LOG('git task end');
                            if (err) {
                                buildTime.git = null;
                                deferred.reject(err);
                            } else {
                                buildTime.git = new Date().getTime() - buildTime.git;
                                deferred.resolve();
                            }
                        });
                    }
                });
            }
        });

        return deferred.promise;
    });
} else {
    gulp.task('git', function () {
        var deferred = Q.defer();

        LOG('git task start');
        buildTime.git = new Date().getTime();
        git.fetch('', '', {args: '--all', cwd: '.' + workDir}, function (err) {
            if (err) {
                buildTime.git = null;
                deferred.reject(err);
            } else {
                git.pull('origin', 'master', {cwd: '.' + workDir}, function (err) {
                    if (err) {
                        buildTime.git = null;
                        deferred.reject(err);
                    } else {
                        git.exec({args: 'log --pretty=format:\'%H\' -n 1', cwd: '.' + workDir}, function (err, stdout) {
                            LOG('git task end');
                            if (err) {
                                buildTime.git = null;
                                deferred.reject(err);
                            } else {
                                resultId = stdout;
                                resultDir += '/' + resultId;
                                buildTime.git = new Date().getTime() - buildTime.git;
                                deferred.resolve();
                            }
                        });
                    }
                });
            }
        });

        return deferred.promise;
    });
}

gulp.task('npm', function () {
    var deferred = Q.defer(),
        task;

    LOG('npm task start');
    buildTime.npm = new Date().getTime();
    task = exec('npm install', {cwd: baseDir + workDir, encoding: 'buffer'}, function (err, stdout, stderr) {
        LOG('npm task end');
        if (err) {
            buildTime.npm = null;
            deferred.reject(err);
        } else {
            buildTime.npm = new Date().getTime() - buildTime.npm;
            deferred.resolve();
        }
    });

    task.stdout.on('data', function (data) {
        // just ignoring logs
    });
    task.stderr.on('data', function (data) {
        LOG('npm task sent data to stderr');
    });

    return deferred.promise;
});

gulp.task('mocha', function () {
    var deferred = Q.defer();

    LOG('mocha task start');
    buildTime.mocha = new Date().getTime();
    mocha.clearFiles();
    mocha.addDir(baseDir + workDir + '/test');
    mocha.run(baseDir + workDir)
        .then(function (stats) {
            LOG('mocha task end');
            fs.writeFileSync(baseDir + resultDir + '/mochaResults.json', JSON.stringify(stats, null, 2));
            buildTime.mocha = new Date().getTime() - buildTime.mocha;
            globals.histograms.mocha.unshift(parseInt(100 * (stats.pass / (stats.all - stats.pending))));
            deferred.resolve();
        });
    return deferred.promise;
});

gulp.task('coverage', function () {
    var deferred = Q.defer(),
        task,
        waitForFilesInterval,
        maxWaitCycle = 30;

    LOG('coverage task start');
    buildTime.coverage = new Date().getTime();
    fs.emptyDirSync(baseDir + workDir + '/coverage');
    task = exec('npm run test_cover', {cwd: baseDir + workDir, encoding: 'buffer'},
        function (/*err, stdout, stderr*/) {
        });

    // TODO - Right now we just ignoring any kind of output from the coverage process
    task.stdout.on('data', function (data) {
    });
    task.stderr.on('data', function (data) {
        LOG('coverage task had internal error print');
    });
    task.on('close', function (code) {
        LOG('coverage task end [' + code + ']');
        if (code === 0 || code === null) {
            buildTime.coverage = new Date().getTime() - buildTime.coverage;
            waitForFilesInterval = setInterval(function () {
                if (fs.readdirSync(baseDir + workDir + '/coverage').length > 1) {
                    clearInterval(waitForFilesInterval);
                    fs.copySync(baseDir + workDir + '/coverage', baseDir + resultDir + '/coverage');
                    deferred.resolve();
                } else {
                    if (--maxWaitCycle === 0) {
                        LOG('coverage task output was not created in time');
                        deferred.resolve();
                    }
                }
            }, 1000);

        } else {
            buildTime.coverage = null;
            deferred.reject(new Error('getting coverage failed:' + code));
        }
    });

    return deferred.promise;
});

gulp.task('process-coverage', function () {
    //TODO - The info contains file-to-file detailed statistics, but right now we only uses the __total__
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

});

LOG('gulp task sequence running starts');
runSequence(
    'git',
    'init-globals',
    'npm',
    'mocha',
    'coverage',
    'process-coverage',
    'save-globals',
    function (err) {
        LOG('finished handling commit:' + resultId);
        if (err) {
            LOG(err);
        }
        //TODO - probably the mocha tries to keep the process alive...
        process.exit(0);
    });