//wrap everything in a self-executing anonymous function to move to local scope
(function (){
    
    //pseudo-global variables
	var attrArray = ["Food_Insecure_Rate_for_Adults_2010", "Food_Insecure_Rate_for_Adults_2015", "Food_Insecure_Rate_for_Adults_2020", "Food_Insecure_Rate_for_Children_2010", "Food_Insecure_Rate_for_Children_2015", "Food_Insecure_Rate_for_Children_2020"]; //list of food insecurity rate attributes
	var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
        var margin = {top: 20, right: 30, bottom: 40, left: 90},
            width = 460 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;  
    
     //create a scale to size bars proportionally to frame and for axis
        var xScale = d3.scaleLinear()
            .range([0, width])
            .domain([35, 0]);
        
    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap() {
        //map frame dimensions
        var width = window.innerWidth * 0.55,
            height = 650;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
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
            
            //add dropdown
            createDropdown(csvData)
            
            }; //end of callback(data)
	}; //end of setMap()
    
    function joinData(usStatesJson, csvData){
       //loop through csv to assign each set of csv attribute values to geojson state 
            for (var i=0; i<csvData.length; i++){
	            var csvState = csvData[i]; //the current state
	            var csvKey = csvState.diss_me; //the CSV primary key

	            //loop through geojson state to find correct state
	            for (var a=0; a<usStatesJson.length; a++){

	                var geojsonProps = usStatesJson[a].properties; //the current state geojson properties
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
        })
         .on("mouseover", function(event, d){
            highlight(d.properties);
        })
         .on("mouseout", function (event, d) {
                dehighlight(d.properties);
        })
         .on("mousemove", moveLabel);
       
        var desc = states.append("desc").text('{"stroke": "#000", "stroke-width": "0.5px"}'); 
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
 
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", 
                 "translate(" + margin.left + "," + margin.top + ")")
            .attr("class", "chart");

        //set bars for each state
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .attr("x", x(0) )
            .attr("y", function(d){
                return "bar " + d.State_Name;
            })
            .attr("width", function(d) {
                return x(d.Food_Insecure_Rate_for_Adults_2010)
            })
            .attr("height", y.bandwidth())
        
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 70)
            .attr("class", "chartTitle")
                    
        //add X axis
        var x = d3.scaleLinear()
            .range([0, width])
            .domain([35, 0]);
        chart.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");
        
        // Y axis
        var y = d3.scaleBand()
            .range([ 0, height ])
            .domain(data.map(function(d) { return d.Country; }))
            .padding(.1);
        chart.append("g")
            .call(d3.axisLeft(y))
        
        //add style descriptor to each rect
        var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
        
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
        
    }; //end of setChart()
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData);
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d) {
                  return d
            })
            .text(function(d){
                return d
            });
    }; //end of createDropdown()  
    
     //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var states = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){            
            var value = d.properties[expressed];            
            if(value) {                
                return colorScale(value);           
            } else {                
                return "#ccc";            
            }    
        });
        //sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //sort bars
            .sort(function (a, b) {
                return parseFloat(b[expressed]) - parseFloat(a[expressed]);
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);
                           
        updateChart(bars, csvData.length, colorScale);
        
}; //end of changeAttribute()
    
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale, numbers) {
        //position bars
        bars.attr("y", function (d, i) {
            return i * (chartInnerHeight / n) + leftPadding;
        })
            //size/resize bars
            .attr("height", function (d, i) {
                return 850 - xScale(parseFloat(d[expressed]));
            })
            .attr("x", function (d, i) {
                return xScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function (d) {
                var value = parseFloat(d[expressed]);
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        
        //add text to chart title
        var chartTitle = d3.select(".chartTitle")
             .text(expressed.split("_")[5] + ":" + expressed.split("_")[0] + " " + expressed.split("_")[1] + " " + expressed.split("_")[2] + " " + expressed.split("_")[3] + " " + expressed.split("_")[4]);
    }

    //function to highlight enumeration units and bars
    function highlight(props) {
        //change stroke
        var selected = d3
            .selectAll("." + props.diss_me)
            .style("stroke", "blue")
            .style("stroke-width", "2");
        setLabel(props);
    }

    //function to reset the element style on mouseout
    function dehighlight(props) {
        var selected = d3.selectAll("." + props.diss_me)
            .style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");
            })
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        function getStyle(element, styleName) {
            var styleText = d3.select(element)
            .select("desc")
            .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        }
        //remove info label
        d3.select(".infolabel").remove();
    };

    //function to create dynamic label
    function setLabel(props) {
        //label content
        var labelAttribute = "<h1>" + props[expressed] + 
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.diss_me + "_label")
            .html(labelAttribute);

        var stateName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };

    //function to move info label with mouse
    function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth - 10,
        y2 = event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};
})(); 