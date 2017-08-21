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
    vtPropField: 'country_code',
    dataPropField: 'adm0',
    colorStops: [['', "rgba(0,255,0,.5)"]],
    heightStops: [[0,0]]
  },adm1: {
    level: 1,
    source: "admin-1",
    source_layer: "boundaries_admin_1",
    minZoom: 5,
    maxZoom: 9,
    vtPropField: 'name',
    dataPropField: 'adm1',
    colorStops: [['', "rgba(128,0,0,0)"]],
    heightStops: [[0,0]]
  },adm2: {
    level: 2,
    source: "admin-2",
    source_layer: "boundaries_admin_2",
    minZoom: 9,
    maxZoom: 16,
    vtPropField: 'name',
    dataPropField: 'adm2',
    colorStops: [['', "rgba(0,0,128,0)"]],
    heightStops: [[0,0]]
  },adm3: {
    level: 3,
    source: "admin-3",
    source_layer: "boundaries_admin_3",
    minZoom: 16,
    maxZoom: 22,
    vtPropField: 'name',
    dataPropField: 'adm3',
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
      result = level;
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
}

function configureMap() {
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
    map.addLayer({
        "id": boundary.source + "_base_fill",
        "type": "fill-extrusion",
        "source": boundary.source,
        "source-layer": boundary.source_layer,
        minzoom: boundary.minZoom,
        maxzoom: boundary.maxZoom,
        "paint": {
          "fill-extrusion-color": "green",
          "fill-extrusion-opacity": 1,
          "fill-extrusion-height": 60000
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
              "line-color": "blue",
              "line-width": 1
          }
      });
  });
  currentlyVisibleLayer = getCurrentlyVisibleLayer();
  console.log('At start the visible layer is', currentlyVisibleLayer);
  setStops(dataLookup, currentlyVisibleLayer);
  //Setting the map events here, they require the layers have been
  //added already
  map.on('zoom', function() {
    console.log('Map zoom level is :', map.getZoom());
    //when the user zooms to a level that changes the visible layer
    // then we need to rebuild the query accordingly and rebuild the stops
    var visibleLayerAfterZoom = getCurrentlyVisibleLayer();
    if(visibleLayerAfterZoom.source !== currentlyVisibleLayer.source) {
      console.log("Changing visible layer on zoom");
      currentlyVisibleLayer = visibleLayerAfterZoom;
      //TODO: if we are filtering then we need to update filters here
      setStops(dataLookup, currentlyVisibleLayer);
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
            setStops(dataLookup, currLayer);
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

function setStops(data, layer) {
    var stopsArray = [];
    var heightStopsArray = [];

    Object.keys(dataLookup).forEach(function(currAttributeKey) {
      var val = dataLookup[currAttributeKey];
      var metrics = getMetrics();
      var currentMetricVal = metrics.Color.raw(val);
      var fillColor = metrics.Color.color(dataLookup[val.group]);
      var red = parseInt(fillColor.substring(1,3), 16);
      var green = parseInt(fillColor.substring(3,5), 16);
      var blue = parseInt(fillColor.substring(5), 16);
      var rgba = "rgba(" + red + "," + green + "," + blue + ",1)";
      //if we have a metric use it as the color stop, otherwise use the count
      if(typeof(val.current.metrics) !== 'undefined') {

      }
      stopsArray.push([val.group[0], rgba]);
//      var height = dataLookup[feature.properties.GEOID].current.count < 65000 ? dataLookup[feature.properties.name].current.count : 65000;
//      heightStopsArray.push([feature.properties.GEOID, height]);
    });
/*
    source._data.features.forEach(function(feature) {
        //look up the color using the Zoomdata data and the Zoomdata colors
        if(feature.properties.GEOID in dataLookup) {
            var fillColor = getMetrics().Color.color(dataLookup[feature.properties.GEOID]);
            var red = parseInt(fillColor.substring(1,3), 16);
            var green = parseInt(fillColor.substring(3,5), 16);
            var blue = parseInt(fillColor.substring(5), 16);
            var rgba = "rgba(" + red + "," + green + "," + blue + ",1)";
            stopsArray.push([feature.properties.GEOID, rgba])
            var height = dataLookup[feature.properties.GEOID].current.count < 65000 ? dataLookup[feature.properties.name].current.count : 65000;
            heightStopsArray.push([feature.properties.GEOID, height]);
        } else {
            stopsArray.push([feature.properties.GEOID, defaultColor]);
            heightStopsArray.push([feature.properties.GEOID, defaultHeight]);
        }
    });
*/
//    map.setPaintProperty(layer.source+'_base_fill', 'fill-extrusion-color', {
//                  property:layer.vtPropField,
//                  type: 'categorical',
//                  stops: stopsArray
//        } );
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
