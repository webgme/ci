/**
 * @author kecso / https://github.com/kecso
 */

var express = require('express'),
    app = express(),
    bodyParser = require('body-parser');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));
// parse application/json
app.use(bodyParser.json());

app.post('/github', function (req, res) {
    console.log('payload arrived');
    console.log(req.body);
    res.send(200);
});

app.listen(45678, function () {
    console.log('Github webhook processor have been initialized');
});