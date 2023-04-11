//wrap everything in a self-executing anonymous function to move to local scope
(function (){
    
    //pseudo-global variables
	var attrArray = ["Food_Insecure_Rate_for_Adults_2010", "Food_Insecure_Rate_for_Adults_2015", "Food_Insecure_Rate_for_Adults_2020", "Food_Insecure_Rate_for_Children_2010", "Food_Insecure_Rate_for_Children_2015", "Food_Insecure_Rate_for_Children_2020"]; //list of food insecurity rate attributes
	var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 523,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
     //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([0, 563])
            .domain([35, 0]);
    
    
    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap() {
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 510;

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
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //set bars for each state
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return parseFloat(b[expressed]) - parseFloat(a[expressed])
            })
            .attr("class", function(d){
                return "bar " + d.diss_me;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function(event, d){
                highlight(d);
            })
            .on("mouseover", function(event, d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
               
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            //.text(expressed.split("_")[5] + ":" + expressed.split("_")[0] + " " + expressed.split("_")[1] + " " + expressed.split("_")[2] + " " + expressed.split("_")[3] + " " + expressed.split("_")[4]);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
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
        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
            //size/resize bars
            .attr("height", function (d, i) {
                return 523 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
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