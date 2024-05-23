let municipalityCodes = {};

async function fetchMunicipalityCodes() {
    const url = 'https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px';
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            const codes = data.variables[1].values;
            const names = data.variables[1].valueTexts;
            for (let i = 0; i < codes.length; i++) {
                municipalityCodes[names[i].toLowerCase()] = codes[i];
            }
        } else {
            console.error(`Server responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching municipality codes:', error);
    }
}


async function fetchDataAndCreateChart(municipalityCode = 'SSS') {
    const url = 'https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px';
    const requestData = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": [
                        "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009",
                        "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019",
                        "2020", "2021"
                    ]
                }
            },
            {
                "code": "Alue",
                "selection": {
                    "filter": "item",
                    "values": [municipalityCode]
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": ["vaesto"]
                }
            }
        ],
        "response": {
            "format": "json"
        }
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    };

    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const data = await response.json();
            const years = data.data.map(item => item.key[0]);
            const birthData = data.data.filter(item => item.key[2] === 'vm01').map(item => parseInt(item.values[0]));
            const population = data.data.map(item => parseInt(item.values[0]));

            const chartData = {
                labels: years,
                datasets: [
                    {
                        name: "Population",
                        values: population
                    }
                ]
            };

            const chart = new frappe.Chart("#chart", {
                title: "Population Over Years",
                data: chartData,
                type: 'line',
                height: 450,
                lineOptions: {
                    dotSize: 4
                },
                colors: ['#eb5146']
            });
            document.chart = chart; 
            if (municipalityCode) {
                localStorage.setItem('municipalityCode', municipalityCode);
            }
        } else {
            console.error(`Server responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

const municipalityForm = document.getElementById('municipality-form');
if (municipalityForm) {
    municipalityForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const municipalityName = document.getElementById('input-area').value.toLowerCase();
        const municipalityCode = municipalityCodes[municipalityName];
        if (municipalityCode) {
            fetchDataAndCreateChart(municipalityCode);
        } else {
            alert('Invalid municipality name');
        }
    });
}

function predictData() {
    const chart = document.chart;  
    const lastDataset = chart.data.datasets[chart.data.datasets.length - 1];
    const dataValues = lastDataset.values;
    
    let deltaSum = 0;
    for (let i = 1; i < dataValues.length; i++) {
        deltaSum += dataValues[i] - dataValues[i - 1];
    }

    const meanDelta = deltaSum / (dataValues.length - 1);
    const nextValue = dataValues[dataValues.length - 1] + meanDelta;

    // Update chart data
    lastDataset.values.push(nextValue);
    chart.data.labels.push('20' + chart.data.labels.length.toString());  
    chart.update();
}


async function fetchBirthDeathDataAndCreateChart(municipalityCode = 'SSS') {
    const url = 'https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px';
    const yearsRange = Array.from({ length: 22 }, (_, i) => (2000 + i).toString()); // Generates ["2000", "2001", ..., "2021"]

    const requestData = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": yearsRange
                }
            },
            {
                "code": "Alue",
                "selection": {
                    "filter": "item",
                    "values": [municipalityCode]
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": ["vm01", "vm11"] 
                }
            }
        ],
        "response": {
            "format": "json"
        }
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    };

    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const data = await response.json();
            console.log('Data:', data);
            const years = data.data.map(item => item.key[0]);
            const birthData = data.data.map(item => parseInt(item.values[0]));
            const deathData = data.data.map(item => parseInt(item.values[1]));

            console.log('Birth Data:', birthData);
            console.log('Death Data:', deathData);
            console.log('Years:', years);


            const chartData = {
                labels: years,
                datasets: [
                    {
                        name: "Births",
                        values: birthData,
                        chartType: 'bar',
                        color: '#63d0ff'
                    },
                    {
                        name: "Deaths",
                        values: deathData,
                        chartType: 'bar',
                        color: '#363636'
                    }
                ]
            };

            const container = document.querySelector('#chart');
            const chart = new frappe.Chart(container, {
                title: "Births and Deaths Over Years",
                data: chartData,
                type: 'bar',
                height: 450
            });
            document.chart = chart;
        } else {
            console.error(`Server responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    fetchMunicipalityCodes().then(() => {
        loadChart(); 
    });
});

function loadChart() {
    const municipalityCode = localStorage.getItem('municipalityCode') || 'SSS';
    
    if (window.location.pathname.endsWith('newchart.html')) {
        const navigationButton = document.getElementById('navigation');
        if (navigationButton) {
            navigationButton.addEventListener('click', function() {
                window.location.href = 'index.html';
            });
        }

        fetchBirthDeathDataAndCreateChart(municipalityCode);
        
    } else {
        const municipalityForm = document.getElementById('municipality-form');
        const addDataButton = document.getElementById('add-data');
        const navigationButton = document.getElementById('navigation');

        if (municipalityForm) {
            municipalityForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const municipalityName = document.getElementById('input-area').value.toLowerCase();
                const municipalityCode = municipalityCodes[municipalityName];
                if (municipalityCode) {
                    fetchDataAndCreateChart(municipalityCode);
                } else {
                    alert('Invalid municipality name');
                }
            });
        }

        if (addDataButton) {
            addDataButton.addEventListener('click', predictData);
        }

        if (navigationButton) {
            navigationButton.addEventListener('click', function() {
                window.location.href = 'newchart.html';
            });
        }

        fetchDataAndCreateChart(municipalityCode);
    }
}
