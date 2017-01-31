/**
 * @author kecso / https://github.com/kecso
 */
var gulp = require('gulp'),
    exec = require('child_process').exec,
    git = require('gulp-git'),
    clean = require('gulp-clean'),
    del = require('del'),
    Q = require('q'),
    FS = require('fs'),
    mocha = require(process.cwd() + '/src/tasks/mocha'),
    workDir = '/webgme',
    baseDir = process.cwd(),
    resultDir = '/results',
    resultId,
    buildTime = {},
    runSequence = require('run-sequence').use(gulp),
    globals,
    detailed;

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
                    mocha: [],
                    npm: [],
                    git: [],
                    performance: []
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
        globals.histograms[time].unshift(buildTime[time]);
    }
    FS.writeFileSync(baseDir + '/results/globals.json', JSON.stringify(globals, null, 2));
});

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

gulp.task('npm', function () {
    var deferred = Q.defer();

    buildTime.npm = new Date().getTime();
    exec('npm install', {cwd: process.cwd() + workDir}, function (err, stdout, stderr) {
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
    gulp.src(process.cwd() + workDir + '/coverage', {read: false})
        .pipe(clean())
});

gulp.task('mocha', function () {
    var deferred = Q.defer();

    mocha.clearFiles();
    mocha.addDir(process.cwd() + workDir + '/test');
    mocha.run(process.cwd() + workDir)
        .then(function (stats) {
            console.log('finished', process.cwd() + resultDir + '/mochaResults.json');
            FS.writeFileSync(process.cwd() + resultDir + '/mochaResults.json', JSON.stringify(stats, null, 2));
            deferred.resolve();
        });
    return deferred.promise;
});

gulp.task('coverage', ['prepare-coverage'], function () {
    var deferred = Q.defer();

    console.log('c');
    buildTime.coverage = new Date().getTime();
    exec('npm run test_cover', {cwd: process.cwd() + workDir}, function (err, stdout, stderr) {
        console.log('c-', err);
        if (err) {
            buildTime.coverage = null;
            deferred.reject(err);
        } else {
            gulp.src(process.cwd() + workDir + '/coverage/**', {read: false})
                .pipe(gulp.dest(process.cwd() + resultDir + '/coverage'))
                .on('end', function () {
                    buildTime.coverage = new Date().getTime() - buildTime.coverage;
                    deferred.resolve();
                });
        }
    });

    return deferred.promise;
});

gulp.task('clean', function () {
    console.log('clean');
    return gulp.src('./work', {read: false})
        .pipe(clean());
});

runSequence(
    'git',
    'init-globals',
    'npm',
    'mocha',
    // 'coverage',
    'save-globals',
    function (err) {
        if (err) {
            console.log(err);
        }
    });
