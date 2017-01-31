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
    console.log(' arrived');
    console.log(req.body);
    res.sendStatus(200);
});

app.listen(45678, function () {
    console.log('WebGME Continous Integration Machine initialized');
});