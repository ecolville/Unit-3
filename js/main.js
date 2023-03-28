//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap() {
    //use Promise.all to parallelize asynchronous data loading

    var promises = [
        d3.csv("data/FoodInsecurity_simple.csv"),
        d3.json("data/US_States.topojson"),
    ];
    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0],
            states = data[1];
        
        //translate states TopoJSON
        var stateShapes = topojson.feature(states, states.objects.US_States);

    //examine the results
    console.log(stateShapes);
    }
}