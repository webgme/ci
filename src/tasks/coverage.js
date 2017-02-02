/**
 * @author kecso / https://github.com/kecso
 */
var fs = require('fs-extra'),
    exec = require('child_process').exec,
    basedir = process.cwd(),
    task;

task = exec('node ./node_modules/istanbul/lib/cli.js --hook-run-in-context cover node_modules/mocha/bin/_mocha ' +
    '-- -R min --timeout 10000 ' +
    '--recursive test', {
    cwd: basedir + '/webgme',
    encoding: 'buffer'
}, function (err, stdout, stderr) {
    console.log('callback');
    console.log(err);
    console.log(fs.readdirSync(basedir + '/webgme/coverage'));
});

task.stdout.on('data', function (data) {

});
task.stderr.on('data', function (data) {

});

task.on('close', function (err) {
    console.log(err);
    console.log('finished');
    console.log(fs.readdirSync(basedir + '/webgme/coverage'));
});