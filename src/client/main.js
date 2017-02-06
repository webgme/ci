require.config({
    baseUrl: './',
    paths: {
        text: 'requirejs-text'
    }
});

require(['text!globals.json','Chart.js'], function (dataGlobals,Chart) {
    'use strict';
    dataGlobals = JSON.parse(dataGlobals);
    console.log(Chart);
    console.log(dataGlobals);

    var ctx = document.getElementById("coverageChart"),
    coverageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dataGlobals.commits,
            datasets: [{
                label: 'percentage of coverage',
                data: dataGlobals.histograms.coverage
            }]
        }
    });

    var detailedCoveragesList = document.getElementById('detailedCoverages'),
        i,
        listItem;

    for(i=0;i<dataGlobals.commits.length;i+=1){
        listItem = document.createElement("li");
        listItem.innerHTML = '<a href="'+dataGlobals.commits[i]+'/coverage/lcov-report/index.html">'+dataGlobals.commits[i]+'</a>'

        detailedCoveragesList.appendChild(listItem);
    }
});