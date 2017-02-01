/**
 * @author kecso / https://github.com/kecso
 */

var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    exec = require('child_process').exec,
    tasks = [],
    currentTask = null,
    port = 45678;

if (process.argv.length === 3) {
    port = Number(process.argv[2]);
}

setInterval(function () {
    var commitHandler;
    if (currentTask === null && tasks.length > 0) {
        currentTask = tasks.shift();
        console.time(currentTask);
        commitHandler = exec('node ./src/gulp/standard.js ' + currentTask, {encoding: 'buffer'}, function (err) {
            console.timeEnd(currentTask);
            currentTask = null;
        });

        commitHandler.stdout.on('data', function (data) {
            //currently just ignoring output
            //console.log(data);
        });
        commitHandler.stderr.on('data', function (data) {
            //currently just ignoring output
            //console.log(data);
        });
    }
}, 1000);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));
// parse application/json
app.use(bodyParser.json());

app.post('/github', function (req, res) {
    //TODO - currently we only process commits for the master branch
    res.sendStatus(200);
    //TODO - proper commithash check would be good
    if (req.body && req.body.ref === 'refs/heads/master' && typeof req.body.after === 'string') {
        tasks.push(req.body.after);
    }
});

app.listen(port, function () {
    console.log('WebGME Continous Integration Machine initialized on port:', port);
});