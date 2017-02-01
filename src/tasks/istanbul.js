/**
 * @author kecso / https://github.com/kecso
 */
var FS = require('fs'),
    PATH = require('path');

module.exports = function (workdir, coverageObjectFilePath) {
    var info = {},
        istanbul = require('istanbul'),
        collector = new istanbul.Collector({}),
        util = istanbul.utils,
        coverage = JSON.parse(FS.readFileSync(coverageObjectFilePath, 'utf8')),
        files,
        sum,
        i;

    collector.add(coverage);

    files = collector.files();

    for (i = 0; i < files.length; i += 1) {
        info[PATH.relative(workdir, files[i])] = util.summarizeFileCoverage(collector.fileCoverageFor(files[i]));
    }
    sum = util.summarizeCoverage(coverage);

    info['__total__'] = {
        lines: sum.lines,
        functions: sum.functions,
        branches: sum.branches
    };

    return info;
};