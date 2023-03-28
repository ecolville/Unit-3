//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap() {
    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //create US-centric composite projection of three Albers equal area conic projections...does the hard work of including AK and HI for me!
    var projection = d3.geoAlbersUsa();
    //Likely don't need commented out code below due to the composite projection being used...according to much reading about d3-geo on github
       // .center([95, 35]) //set the long and lat of center
       // .rotate([-2, 0, 0]) //set long, lat, and roll angles
       // .parallels([29, 45]) //set two standard parallel  
       // .scale(10) //set scale for map
       // .translate([width / 2, height / 2]); //offsets the pixel coordinates of the projection's center in the <svg> container
    
    //create a path generator
    var path = d3.geoPath().projection(projection);
    
    //use Promise.all to parallelize asynchronous data loading
    var promises = [
        d3.csv("data/FoodInsecurity_simple.csv"),
        d3.json("data/US_States.topojson"),
    ];
    Promise.all(promises).then(callback);

    //callback function
    function callback(data) {
        var csvData = data[0],
            usStates = data[1];
        
        //translate states TopoJSON to GeoJSON...use .features to access every state
        var usStatesJson = topojson.feature(usStates, usStates.objects.US_States).features;
    
        //add each state enumeration unit separately to map
        var states = map.append("path")
            .data(usStatesJson)
            .enter()
            .att("class", function(d){
                return "states" + d.properties.diss_me; 
            }) //generic class of states created, then assign unique class based on the diss_me attribute, which the key between the csv and json data
        .attr("d", path); //draw state geometry....this isn't happening...why?
    }
};