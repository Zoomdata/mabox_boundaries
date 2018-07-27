/*
 * Copyright (C) Zoomdata, Inc. 2012-2017. All rights reserved.
 */
/* global controller */

var dataLookup = {};

console.log('starting visualization, controller variables:', controller.variables);
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

var heightFactor = controller.variables['Extrusion Factor'];
console.log('extrusion factor is ', heightFactor);
var layerOpacity = controller.variables['Opacity'];

controller.element.appendChild(mb_js);
controller.element.appendChild(mb_css);
controller.element.appendChild(mapDiv);

//The "Layer Configuration" variable set in the chart properties drive what layers are displayed.  This
//chart uses administrative boundaries.  Users can choose which ones, level 0 through
//level 3 are supported.  Variable must be in JSON format.

var layerConfigurationString = controller.variables['Layer Configuration'];
console.log('layerConfigurationString ', layerConfigurationString);
try {
var testMapBoundariesLevels = JSON.parse(layerConfigurationString);
} catch(e) {
  console.error("Error parsing configuration string.  Make sure the string is properly formatted JSON", e);
  console.error("String from variable is ", layerConfigurationString);
}
//TODO: implement check on configuration:
// - dataPropField exists
// - bounds for Zoom levels (maybe)
// - if min or max zoom not defined set it to a default value (0 or 22)
//for each configuration set some known defaults/values
Object.keys(testMapBoundariesLevels).forEach( function(key) {
  testMapBoundariesLevels[key].source = key;
  testMapBoundariesLevels[key].source_layer = 'boundaries_'+ key;
  testMapBoundariesLevels[key].vtPropField = 'id';
  testMapBoundariesLevels[key].colorStops= [['', "rgba(0,255,0,.5)"]];
  testMapBoundariesLevels[key].heightStops =  [['', 0]];
});

console.log('Test Map boundaries are set to:', testMapBoundariesLevels);

var mapBoundariesLevels = {
  adm0: {
    level: 0,
    source: "admin-0",
    source_layer: "boundaries_admin_0",
    minZoom: 0,
    maxZoom: 3,
    vtPropField: 'id',//'country_code',
    dataPropField: 'adm0_id',
    colorStops: [['', "rgba(0,255,0,.5)"]],
    heightStops: [[0,0]]
  }, adm1: {
    level: 1,
    source: "admin-1",
    source_layer: "boundaries_admin_1",
    minZoom: 3,
    maxZoom: 7,
    vtPropField: 'id',
    dataPropField: 'adm1_id',
    colorStops: [['', "rgba(128,0,0,0)"]],
    heightStops: [[0,0]]
  },adm2: {
    level: 2,
    source: "admin-2",
    source_layer: "boundaries_admin_2",
    minZoom: 7,
    maxZoom: 12,
    vtPropField: 'id',
    dataPropField: 'adm2_id',
    colorStops: [['', "rgba(0,0,128,0)"]],
    heightStops: [[0,0]]
  },adm3: {
    level: 3,
    source: "admin-3",
    source_layer: "boundaries_admin_3",
    minZoom: 12,
    maxZoom: 22,
    vtPropField: 'id',
    dataPropField: 'adm3_id',
    colorStops: [['', "rgba(0,255,0,0)"]],
    heightStops: [[0,0]]
  }
}

mapBoundariesLevels = testMapBoundariesLevels;

function getCurrentlyVisibleLayer() {
  console.log('checking currently visible layer');
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

}

function configureMap() {
  var nav = new mapboxgl.NavigationControl();
  map.addControl(nav, 'top-left');
/*  map.addSource("admin-0", {
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
*/
  Object.keys(mapBoundariesLevels).forEach(function(currKey) {
    map.addSource(currKey, {
      type: "vector",
      url: mapBoundariesLevels[currKey].url
    })
  // for each level we want a fill (extruded) and a border
    var boundary = mapBoundariesLevels[currKey];
    console.log('Adding layer to map:', boundary.source+"_base_fill", boundary);
    map.addLayer({
        "id": boundary.source + "_base_fill",
        "type": "fill-extrusion",
        "source": boundary.source,
        "source-layer": boundary.source_layer,
        minzoom: boundary.minZoom,
        maxzoom: boundary.maxZoom,
        "paint": {
          "fill-extrusion-color": "green",
          "fill-extrusion-opacity": layerOpacity,
          "fill-extrusion-height": 0
        }
    }, 'waterway-label');
console.log('layer just added: ', map.getLayer(boundary.source+"_base_fill"));

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
//  setStops(dataLookup, currentlyVisibleLayer, map.queryRenderedFeatures());
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
      currGroup.limit = 200000; //TOOD: hard-coded limit to make all features appear, need to make this dynamic if we can get a count of features from Mapbox layer
      //TODO: adjust limit dynamically to the number of featuers in the layer (or number of visible features, if we can do that)
          controller.dataAccessors['Group By'].setGroup((currentlyVisibleLayer.dataPropField, currGroup));
      //TODO: if we are filtering then we need to update filters here
      // Changing the group by will cause controller.update, which does this: setStops(dataLookup, currentlyVisibleLayer, map.queryRenderedFeatures());
    }
  });
  map.on('moveend', function() {
//    console.log('Map moveend');
    //TODO: if we are filtering we need to update filters here
  })

  // When a click event occurs on a feature in the places layer, open a popup at the
  // location of the feature, with description HTML from its properties.

  //TODO: we could have a click event listener per layer, or remove the layer name param
  //and implement logic to determine what layer is active
  map.on('click', /*level.source*/ 'admin-0'+'_base_fill', function (e) {
    console.log('clicked on layer ', e);

    var tooltipString = '';//TODO: get name '<B>Area Name</b><br/>'
    var metrics = getMetrics();
    Object.keys(metrics).forEach(function(metricKey) {
      var val = getAreaMetric(e.features[0], metricKey);
      tooltipString += '<b>' + metrics[metricKey].getLabel() + ':</b> ';
      tooltipString += metrics[metricKey].format(val) + '<br/>';
    });

    //get the feature ID from the event, then we need to look up the actual values
    //from the Zoomdata data collection
    var featureID = e.features[0].properties.id;
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(tooltipString)
            .addTo(map);
    });

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
//            setStops(dataLookup, currLayer, map.queryRenderedFeatures());
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

  //Function finds the metric value associated with a specific feature
  getAreaMetric = function(feature, metricKey) {
    var metrics = getMetrics();
    var metricFieldName = metrics[metricKey].getMetric().name;
    var metricFuncName = metrics[metricKey].getMetric().func;
    var result = -1;
    try {
    var polygonId = feature.properties.id;
    //TODO: hack way to get value, need to use proper accessors
    if (typeof(dataLookup[polygonId]) !== 'undefined') {
      if(metricFieldName === 'count') {
        result = dataLookup[polygonId].current.count;
      } else {
        result = dataLookup[polygonId].current.metrics[metricFieldName][metricFuncName];
      }
    }
  } catch(e) {
    console.error('Error getting well metric ', e);
  }
  //    console.log(' well metric for ', wellId, " is ", result);
    return (result);
  };

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
        //TODO: right now height is hard-coded to volume.  Link to metric specified by user
        var heightField = controller.variables["Height"];
        var heightMetricFieldName = metrics.Height.getMetric().name;
        var heightMetricFieldFunc = metrics.Height.getMetric().func;
        var heightMetricVal;
        if(heightMetricFieldName === 'count') {
          heightMetricVal = dataLookup[currAttributeKey].current.count;
        } else {
          heightMetricVal = dataLookup[currAttributeKey].current.metrics[heightMetricFieldName][heightMetricFieldFunc];
        }
      var height = heightMetricVal * heightFactor < 65000 ? heightMetricVal * heightFactor : 65000;
      heightStopsArray.push([val.group[0], height ]);
      }
    });


    map.setPaintProperty(layer.source+'_base_fill', 'fill-extrusion-color', {
                  property: layer.vtPropField,
                  type: 'categorical',
                  stops: stopsArray,
                  default: 'lightgray'
        } );

    map.setPaintProperty(layer.source+'_base_fill', 'fill-extrusion-height', {
        property: layer.vtPropField,
        type: 'categorical',
        stops: heightStopsArray,
        default: 0
    })
//    console.log('Stops set to ', stopsArray);
//    console.log('height stops:', heightStopsArray);
}
controller.resize = function(width, height, size) {
    // Called when the widget is resized
    if(map) { map.resize(); }
};

controller.createAxisLabel({
  picks: 'Color', // Variable Name
  orientation: 'horizontal',
  position: 'bottom',
  popoverTitle: 'Color'
});

controller.createAxisLabel({
  picks: 'Height', // Variable Name
  orientation: 'horizontal',
  position: 'bottom',
  popoverTitle: 'Height'
});
