/*
 * Copyright (C) Zoomdata, Inc. 2012-2017. All rights reserved.
 */
/* global controller */

var dataLookup = {};

//load mapbox and define a target div

var uuid = new Date().getTime();
var mapVarId = 'map-' + uuid;
var mapDiv = document.createElement('div');
var dataLookup = {};
mapDiv.id = mapVarId;
mapDiv.style='width:100%;height:100%;'
var map = null;
var currentlyVisibleLayer = undefined;
dataLookup = {};
var mb_css = document.createElement('link');
mb_css.href='https://api.mapbox.com/mapbox-gl-js/v0.36.0/mapbox-gl.css';
mb_css.rel='stylesheet';
var mb_js = document.createElement('script');
mb_js.src = 'https://api.mapbox.com/mapbox-gl-js/v0.36.0/mapbox-gl.js';
mb_js.type='text/javascript';
mb_js.onload = function() {
    //mapbox has to be loaded before we do anything else
    initializeMap();
};


controller.element.appendChild(mb_js);
controller.element.appendChild(mb_css);
controller.element.appendChild(mapDiv);

//The variables set in the chart properties drive what layers are displayed.  This
//chart uses administrative boundaries.  Users can choose which ones, level 0 through
//level 3 are supported.  The property for each layer is selected; if the user
//selects "None" then that layer shouldn't be displayed.  Dynamically calculate the
//zoom levels based on the chart variables
var mapBoundariesLevels = {
  adm0: {
    level: 0,
    source: "admin-0",
    source_layer: "boundaries_admin_0",
    minZoom: 0,
    maxZoom: 5,
    vtPropField: 'id',//'country_code',
    dataPropField: 'adm0_id',
    colorStops: [['', "rgba(0,255,0,.5)"]],
    heightStops: [[0,0]]
  }, adm1: {
    level: 1,
    source: "admin-1",
    source_layer: "boundaries_admin_1",
    minZoom: 5,
    maxZoom: 9,
    vtPropField: 'id',
    dataPropField: 'adm1_id',
    colorStops: [['', "rgba(128,0,0,0)"]],
    heightStops: [[0,0]]
  },adm2: {
    level: 2,
    source: "admin-2",
    source_layer: "boundaries_admin_2",
    minZoom: 9,
    maxZoom: 16,
    vtPropField: 'id',
    dataPropField: 'adm2_id',
    colorStops: [['', "rgba(0,0,128,0)"]],
    heightStops: [[0,0]]
  },adm3: {
    level: 3,
    source: "admin-3",
    source_layer: "boundaries_admin_3",
    minZoom: 16,
    maxZoom: 22,
    vtPropField: 'id',
    dataPropField: 'adm3_id',
    colorStops: [['', "rgba(0,255,0,0)"]],
    heightStops: [[0,0]]
  }
}

function getCurrentlyVisibleLayer() {
  var result = undefined;
  var currZoom = map.getZoom();
  //iterate through the layer configurations, find the zoom level that matches current zoom
  Object.keys(mapBoundariesLevels).forEach(function(levelKey) {
    var level = mapBoundariesLevels[levelKey];
    if((level.minZoom <= currZoom) && (currZoom <= level.maxZoom)) {
      var testLayer = map.getLayer(level.source+'_base_fill');
      if(testLayer) {
        result = level;
      }
    }
  })

  return result;
}

function initializeMap() {
    mapboxgl.accessToken =  controller.variables['Mapbox Access Token'];
    map = new mapboxgl.Map({
        container: mapDiv.id,
        style: 'mapbox://styles/mapbox/streets-v9',
        //TODO: issue with float variable type in CLI/chart studio needs to be resolved
        //center: [controller.variables['Initial Map Center Lon'], controller.variables['Initial Map Center Lat']],
        center: [0, 15.0],
        zoom: 1.5, //TODO: add to controller variables
        minZoom: 1.5 //TODO: add to controller variables
        //TODO: maxBounds from controller variables
    });
    map.on('load', configureMap);
    map.on('click', function (e) {
      var features = map.queryRenderedFeatures(e.point);
      console.log("On click: ", features);
    });
}

function configureMap() {
  var nav = new mapboxgl.NavigationControl();
  map.addControl(nav, 'top-left');
  map.addSource("admin-0", {
      type: "vector",
      url: "mapbox://mapbox.enterprise-boundaries-a0-v1"
  });

  map.addSource("admin-1", {
      type: "vector",
      url: "mapbox://mapbox.enterprise-boundaries-a1-v1"
  });

  map.addSource("admin-2", {
      type: "vector",
      url: "mapbox://mapbox.enterprise-boundaries-a2-v1"
  });

  map.addSource("admin-3", {
      type: "vector",
      url: "mapbox://mapbox.enterprise-boundaries-a3-v1"
  });

  Object.keys(mapBoundariesLevels).forEach(function(currKey) {
  // for each level we want a fill (extruded) and a border
    var boundary = mapBoundariesLevels[currKey];
    console.log('Adding layer to map:', boundary.source+"_base_fill");
    map.addLayer({
        "id": boundary.source + "_base_fill",
        "type": "fill-extrusion",
        "source": boundary.source,
        "source-layer": boundary.source_layer,
        minzoom: boundary.minZoom,
        maxzoom: boundary.maxZoom,
        "paint": {
          "fill-extrusion-color": "green",
          "fill-extrusion-opacity": .6,
          "fill-extrusion-height": 0
        }
    }, 'waterway-label');


      map.addLayer({
          id: boundary.source + "_layer_borders",
          type: "line",
          source: boundary.source,
          minzoom: boundary.minZoom,
          maxzoom: boundary.maxZoom,
          "source-layer": boundary.source_layer,
          layout: {},
          paint: {
              "line-color": "darkgray",
              "line-width": 1
          }
      });
  });
  currentlyVisibleLayer = getCurrentlyVisibleLayer();
  console.log('At start the visible layer is', currentlyVisibleLayer);
  setStops(dataLookup, currentlyVisibleLayer, map.queryRenderedFeatures());
  //Setting the map events here, they require the layers have been
  //added already
  map.on('zoom', function() {
//    console.log('Map zoom level is :', map.getZoom());
    //when the user zooms to a level that changes the visible layer
    // then we need to rebuild the query accordingly
    var visibleLayerAfterZoom = getCurrentlyVisibleLayer();
    if(visibleLayerAfterZoom.source !== currentlyVisibleLayer.source) {
      console.log("Changing visible layer on zoom");
      currentlyVisibleLayer = visibleLayerAfterZoom;
      var currGroup = controller.dataAccessors['Group By'].getGroup();
      currGroup.name = currentlyVisibleLayer.dataPropField;
      //TODO: adjust limit dynamically to the number of featuers in the layer (or number of visible features, if we can do that)
console.log('Setting new group ', currentlyVisibleLayer.dataPropField, ' for group ', currGroup);
          controller.dataAccessors['Group By'].setGroup((currentlyVisibleLayer.dataPropField, currGroup));
      //TODO: if we are filtering then we need to update filters here
      // Changing the group by will cause controller.update, which does this: setStops(dataLookup, currentlyVisibleLayer, map.queryRenderedFeatures());
    }
  });
  map.on('moveend', function() {
    console.log('Map moveend');
    //TODO: if we are filtering we need to update filters here
  })

    //map.on('mousemove', 'states_layer_base_fill', function(e) {console.log(e);});
    //setStops(dataLookup, map.getLayer('counties_base_fill'));
    console.log("Map configuration complete");
}

controller.update = function(data, progress) {
    // Called when new data arrives
//    console.log('Controller update ', progress, ' with data ', data);
    dataLookup = {};
    for (var i = 0; i < data.length; i++) {
        var item = data[i];
        dataLookup[item.group] = item;
    }

    //set the style for each polygon based on the value of the data
    if(map !== null) {
        var currLayer = getCurrentlyVisibleLayer();
        if(currLayer) {
            setStops(dataLookup, currLayer, map.queryRenderedFeatures());
        }
    }


};

  function getMetrics()  {
      var dataAccessors = controller.dataAccessors;
      var metrics = {};

      _.forOwn(dataAccessors, function(value, key) {
          if (value.TYPE === value.TYPES.METRIC ||
              value.TYPE === value.TYPES.MULTI_METRIC) {
              metrics[key] = value;
          }
      });

      return metrics;
  }

function setStops(data, layer, features) {
  console.log('setting stops for ', layer, ' against data ', data);
    var stopsArray = [];
    var heightStopsArray = [];
    var defaultColor = 'gray';
    var defaultHeight = 0;
    //TODO: only for features in currently visible layer

    Object.keys(dataLookup).forEach(function(currAttributeKey) {
      var val = dataLookup[currAttributeKey];
      if(val.group[0] !== null) { //Mapbox GL doesn't like stops with null
        var metrics = getMetrics();
        var currentMetricVal = metrics.Color.raw(val);
        var fillColor = metrics.Color.color(dataLookup[val.group]);
        var red = parseInt(fillColor.substring(1,3), 16);
        var green = parseInt(fillColor.substring(3,5), 16);
        var blue = parseInt(fillColor.substring(5), 16);
        var rgba = "rgba(" + red + "," + green + "," + blue + ",0.8)";
        stopsArray.push([val.group[0], rgba]);
//      var height = dataLookup[feature.properties.GEOID].current.count < 65000 ? dataLookup[feature.properties.name].current.count : 65000;
//      heightStopsArray.push([feature.properties.GEOID, height]);
      }
    });

/*
    features.forEach(function(feature) {
        //look up the color using the Zoomdata data and the Zoomdata colors
        var currFieldName = layer.vtPropField;
        console.log(feature.layer.id);
        if((feature.layer.id === layer.source+'_base_fill') && (feature.properties[currFieldName] in dataLookup)) { //TODO: property name different for layers
            console.log('found feature match:', feature.properties[currFieldName])
              var fillColor = getMetrics().Color.color(dataLookup[feature.properties.name]);
              var red = parseInt(fillColor.substring(1,3), 16);
              var green = parseInt(fillColor.substring(3,5), 16);
              var blue = parseInt(fillColor.substring(5), 16);
              var rgba = "rgba(" + red + "," + green + "," + blue + ",1)";
              stopsArray.push([feature.properties[currFieldName], rgba])
              var height = dataLookup[feature.properties[currFieldName]].current.count < 65000 ? dataLookup[feature.properties[currFieldName]].current.count : 65000;
              heightStopsArray.push([feature.properties[currFieldName], height]);
        } else {
//            stopsArray.push([feature.properties[currFieldName], defaultColor]);
//            heightStopsArray.push([feature.properties[currFieldName], defaultHeight]);
        }
    });
*/
console.log('setting stops for layer ', layer.source+'_base_fill', " on property", layer.vtPropField);
    map.setPaintProperty(layer.source+'_base_fill', 'fill-extrusion-color', {
                  property: layer.vtPropField,
                  type: 'categorical',
                  stops: stopsArray,
                  default: 'lightgray'
        } );
/*
    map.setPaintProperty(layer.id, 'fill-extrusion-opacity', 0.5);
    map.setPaintProperty(layer.id, 'fill-extrusion-height', {
        property: "GEOID",
        type: 'categorical',
        stops: heightStopsArray
    })
    */
    console.log('Stops set to ', stopsArray);
}
controller.resize = function(width, height, size) {
    // Called when the widget is resized
    if(map) { map.resize(); }
};

controller.createAxisLabel({
  picks: 'Color', // Variable Name
  orientation: 'horizontal',
  position: 'bottom',
  popoverTitle: 'Metric'
});
