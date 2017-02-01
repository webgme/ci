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
    clean = require('gulp-clean'),
    del = require('del'),
    Q = require('q'),
    FS = require('fs'),
    mocha = require(baseDir + '/src/tasks/mocha'),
    istanbul = require(baseDir + '/src/tasks/istanbul'),
    buildTime = {},
    runSequence = require('run-sequence').use(gulp),
    globals,
    detailed;

if (process.argv.length === 3) {
    resultId = process.argv[2];
}

gulp.task('init-globals', function () {
    var directories;

    try {
        globals = JSON.parse(FS.readFileSync(baseDir + '/results/globals.json'));
    } catch (e) {
        console.log('globals are not yet created');
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

    directories = FS.readdirSync(baseDir + '/results');
    if (directories.indexOf(resultId) !== -1) {
        throw new Error('commit hash was already processed!');
    }

    FS.mkdirSync(baseDir + resultDir);
    globals.detailed[resultId] = {};
    detailed = globals.detailed[resultId];
    globals.commits.unshift(resultId);
});

gulp.task('save-globals', function () {
    var time;

    detailed.buildTime = buildTime;
    for (time in buildTime) {
        globals.histograms[time + 'Time'].unshift(buildTime[time]);
    }
    FS.writeFileSync(baseDir + '/results/globals.json', JSON.stringify(globals, null, 2));
});

if (resultId) {
    gulp.task('git', function () {
        var deferred = Q.defer();

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
                            if (err) {
                                buildTime.git = null;
                                deferred.reject(err);
                            } else {
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
} else {
    gulp.task('git', function () {
        var deferred = Q.defer();

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
    var deferred = Q.defer();

    buildTime.npm = new Date().getTime();
    exec('npm install', {cwd: baseDir + workDir, encoding: 'buffer'}, function (err, stdout, stderr) {
        if (err) {
            buildTime.npm = null;
            deferred.reject(err);
        } else {
            buildTime.npm = new Date().getTime() - buildTime.npm;
            deferred.resolve();
        }
    });

    return deferred.promise;
});

gulp.task('prepare-coverage', function () {
    gulp.src(baseDir + workDir + '/coverage', {read: false})
        .pipe(clean())
});

gulp.task('mocha', function () {
    var deferred = Q.defer();

    buildTime.mocha = new Date().getTime();
    mocha.clearFiles();
    mocha.addDir(baseDir + workDir + '/test');
    mocha.run(baseDir + workDir)
        .then(function (stats) {
            FS.writeFileSync(baseDir + resultDir + '/mochaResults.json', JSON.stringify(stats, null, 2));
            buildTime.mocha = new Date().getTime() - buildTime.mocha;
            globals.histograms.mocha.unshift(parseInt(100 * (stats.pass / (stats.all - stats.pending))));
            deferred.resolve();
        });
    return deferred.promise;
});

gulp.task('coverage', function () {
    var deferred = Q.defer(),
        task;

    buildTime.coverage = new Date().getTime();
    task = exec('npm run test_cover', {cwd: baseDir + workDir, encoding: 'buffer'},
        function (/*err, stdout, stderr*/) {
            buildTime.coverage = new Date().getTime() - buildTime.coverage;
            setTimeout(function () {
                gulp.src(baseDir + workDir + '/coverage/**')
                    .pipe(gulp.dest(baseDir + resultDir + '/coverage'))
                    .on('finish', function () {
                        deferred.resolve();
                    });
            }, 1000);
        });

    // TODO - Right now we just ignoring any kind of output from the coverage process
    task.stdout.on('data', function (data) {
    });
    task.stderr.on('data', function (data) {
    });

    return deferred.promise;
});

gulp.task('process-coverage', function () {
    //TODO - The info contains file-to-file detailed statistics, but right now we only uses the __total__
    var coverageInfo = istanbul(baseDir + workDir, baseDir + resultDir + '/coverage/coverage.json');

    globals.histograms.coverage.unshift(coverageInfo.__total__.lines.pct);

});

runSequence(
    'git',
    'init-globals',
    'npm',
    'mocha',
    'prepare-coverage',
    'coverage',
    'process-coverage',
    'save-globals',
    function (err) {
        console.log('finished handling commit:', resultId);
        if (err) {
            console.error(err);
        }
        //TODO - probably the mocha tries to keep the process alive...
        process.exit(0);
    });