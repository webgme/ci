require.config({
    baseUrl: './',
    paths: {
        text: 'requirejs-text'
    }
});

require(['text!globals.json', 'Chart.js'], function (dataGlobals, Chart) {
    'use strict';
    dataGlobals = JSON.parse(dataGlobals);
    console.log(Chart);
    console.log(dataGlobals);


    // Build Times Chart
    // coverageTime
    // gitTime
    // mochaTime
    // npmTime
    // performanceTime
    var buildChartCtx = document.getElementById('buildTimeChart'),
        buildChart = new Chart(buildChartCtx,{
            type:'bar',
            data:{
                labels:dataGlobals.commits,
                datasets:[
                    {
                        label: 'git',
                        backgroundColor:'black',
                        data: dataGlobals.histograms.gitTime
                    },
                    {
                        label: 'npm',
                        backgroundColor:'grey',
                        data: dataGlobals.histograms.npmTime
                    },
                    {
                        label: 'mocha',
                        backgroundColor:'yellow',
                        data: dataGlobals.histograms.mochaTime
                    },
                    {
                        label: 'coverage',
                        backgroundColor:'red',
                        data: dataGlobals.histograms.coverageTime
                    },
                    {
                        label: 'performance',
                        backgroundColor:'blue',
                        data: dataGlobals.histograms.performanceTime
                    }
                ]
            },
            options:{
                hover:{
                    mode:'label'
                },
                scales:{
                    xAxes:[{display:false}],
                    yAxes:[{stacked:true}]
                }
            }
        });

    // Mocha Chart
    var mochaChartCtx = document.getElementById('mochaChart'),
        mochaChart = new Chart(mochaChartCtx,{
            type:'bar',
            data:{
                labels:dataGlobals.commits,
                datasets:[
                    {
                        label: 'pending',
                        backgroundColor:'blue',
                        data: dataGlobals.histograms.mocha.pending
                    },
                    {
                        label: 'pass',
                        backgroundColor:'green',
                        data: dataGlobals.histograms.mocha.pass
                    },
                    {
                        label: 'fail',
                        backgroundColor:'red',
                        data: dataGlobals.histograms.mocha.fail
                    }
                ]
            },
            options:{
                hover:{
                    mode:'label'
                },
                scales:{
                    xAxes:[{display:false}],
                    yAxes:[{stacked:true}]
                }
            }
        });

    // Code Coverage Chart
    var coverageChartCtx = document.getElementById('coverageChart'),
        coverageChart = new Chart(coverageChartCtx,{
            type:'bar',
            data:{
                labels:dataGlobals.commits,
                datasets:[
                    {
                        label: 'code coverage %',
                        backgroundColor:'cyan',
                        data: dataGlobals.histograms.coverage
                    }
                ]
            },
            options:{
                hover:{
                    mode:'label'
                },
                scales:{
                    xAxes:[{display:false}],
                    yAxes:[{stacked:true}]
                }
            }
        });

    // Travere Perfomance Chart
    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++ ) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    var traverseChartCtx = document.getElementById('traverseChart'),
        traverseChart,
        traverseChartDatasets = [],
        project;

    for(project in dataGlobals.histograms.performance){
        traverseChartDatasets.push({
            label: project,
            fill:false,
            borderColor: getRandomColor(),
            data: dataGlobals.histograms.performance[project]
        });
    }
    traverseChart = new Chart(traverseChartCtx,{
        type:'line',
        data:{
            labels:dataGlobals.commits,
            datasets: traverseChartDatasets
        },
        options:{
            hover:{
                mode:'label'
            },
            scales:{
                xAxes:[{display:false}]
            }
        }
    });
    // Links to the covergae Artifacts
    var detailedCoveragesList = document.getElementById('detailedCoverages'),
        commitLinksList = document.getElementById('commitLinks'),
        i,
        listItem;

    for (i = 0; i < dataGlobals.commits.length; i += 1) {
        // coverage artifacts
        listItem = document.createElement("li");
        listItem.innerHTML = '<a href="' + dataGlobals.commits[i] + '/coverage/lcov-report/index.html" target="_blank">' + dataGlobals.commits[i] + '</a>';
        detailedCoveragesList.appendChild(listItem);
        // coverage artifacts
        listItem = document.createElement("li");
        listItem.innerHTML = '<a href="https://github.com/webgme/webgme/commit/' + dataGlobals.commits[i] + '" target="_blank">' + dataGlobals.commits[i] + '</a>';
        commitLinksList.appendChild(listItem);
    }
});