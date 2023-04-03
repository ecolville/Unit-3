//wrap everything in a self-executing anonymous function to move to local scope
(function (){
    
    //pseudo-global variables
	var attrArray = ["Food_Insecure_Rate_for_Adults", "Number_of_Food_Insecure_People", "Food_Insecure_Rate_for_Children", "Number_of_Food_Insecure_Children", "Average_Cost_per_Meal_Consumed", "State_Annual_Food_Budget_Shortfall"]; //list of attributes
	var expressed = attrArray[0]; //initial attribute

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap() {
        //map frame dimensions
        var width = 950,
            height = 610;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)
                
        //create US-centric composite projection of three Albers equal area conic projections...does the hard work of including AK and HI for me!
        var projection = d3.geoAlbersUsa();
            
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
    
            //join csv data to GeoJSOn enumeration units
            states = joinData(usStatesJson, csvData)
        
            //create the color scale
            var colorScale = makeColorScale(csvData);
            
            //add enumeration units to the map
            setEnumerationUnits(usStatesJson, map, path, colorScale);
            
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
            
            }; //end of callback(data)
	}; //end of setMap()
    
    let centered, us
    
    function joinData(usStatesJson, csvData){
       //loop through csv to assign each set of csv attribute values to geojson state 
            for (var i=0; i<csvData.length; i++){
	            var csvState = csvData[i]; //the current state
	            var csvKey = csvState.diss_me; //the CSV primary key

	            //loop through geojson state to find correct state
	            for (var a=0; a<usStatesJson.length; a++){

	                var geojsonProps = usStatesJson[a].properties; //the current region geojson properties
	                var geojsonKey = geojsonProps.diss_me; //the geojson primary key

	                //where primary keys match, transfer csv data to geojson properties object
	                if (geojsonKey == csvKey){

	                    //assign all attributes and values
	                    attrArray.forEach(function(attr){
	                        var val = parseFloat(csvState[attr]); //get csv attribute value
	                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
	                    });
	                };
	            };
	        };
	        return usStatesJson;
	};
    
    function setEnumerationUnits(usStatesJson, map, path, colorScale){    
        //add each state enumeration unit separately to map
        var states = map.selectAll(".states") //select states that will be created
            .data(usStatesJson)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.diss_me; 
            }) //generic class of states created, then assign unique class based on the diss_me attribute, which is the key between the csv and json data
        .attr("d", path) //draw state geometry
        .style("fill", function(d){            
                var value = d.properties[expressed];            
                if(value) {                
                    return colorScale(d.properties[expressed]);            
                } else {                
                    return "#ccc";            
                }    
        });
    };
    
    function makeColorScale(data){
		//create color scale generator
	    var colorScale = d3.scaleQuantile()
	        .range(colorbrewer.YlGnBu[5]);

	    //build array of all values of the expressed attribute
	    var domainArray = [];
	    for (var i=0; i<data.length; i++){
	        var val = parseFloat(data[i][expressed]);
	        domainArray.push(val);
	    };

	    //assign array of expressed values as scale domain
	    colorScale.domain(domainArray);

	    return colorScale;
	};
    
    //add tooltip
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
    
    //add clickable background
    var background = map.append("rect")
        .attr("class", "background")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .on("click", click)
    
    function read (error, topo){
        var mouseOver = function(d){
            d3.selectAll(".states")
                .transition()
                .duration(200)
                .style("opacity", 0.5)
                .style("stroke", "transparent");
            d3.select(this)
                .transition()
                .duration(200)
                .style("opacity", 1)
                .style("stroke", "black");
            tooltip.style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px")
			    .transition().duration(400)
                .style("opacity", 1)
                .text(d.properties[expressed])
	       }
        
        var mouseLeave = function (){
            d3.selectAll(".states")
                .transition()
			    .duration(200)
                .style("opacity", 1)
                .style("stroke", "transparent");
            tooltip.transition().duration(300)
                .style("opacity", 0);
	       }
        };
})(); 