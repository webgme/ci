/**
 * @author kecso / https://github.com/kecso
 */

var baseDir = process.cwd(),
    fs = require('fs-extra');

fs.copySync(baseDir+'/node_modules/chart.js/dist/Chart.js',baseDir+'/results/Chart.js');
fs.copySync(baseDir+'/node_modules/jquery/dist/jquery.js',baseDir+'/results/jquery.js');
fs.copySync(baseDir+'/node_modules/requirejs/require.js',baseDir+'/results/require.js');
fs.copySync(baseDir+'/node_modules/text/text.js',baseDir+'/results/requirejs-text.js');
fs.copySync(baseDir+'/src/client',baseDir+'/results');