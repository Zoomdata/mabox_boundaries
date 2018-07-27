This proof of concept visualization uses the MapboxGL library and the Mapbox Enterprise Boundaries dataset to build a choropleth map.  The map is similar to the Zoomdata Map: World Countries in that it colors polygons based on aggregate data from Zoomdata.  Instead of using GeoJSON for the boundaries this chart uses the enterprise boundaries for the polygons.  This offers the following advantages:

* Enterprise Boundaries are global at multiple levels, providing great fidelity for geopolitical boundaries not avaialble from freely downloadable resources (or other paid sources, for that matter)
* The boundaries are provided as a stream from the Mapbox service.  There is no need to load the GeoJSON as a library at design time, boundaries are loaded dynamically as needed.


# TODO
## Region Identifiers
The chart expects aggregations to be done on the Mapbox ID for the region.  This is not acceptable as most customer data will not use this value.  Instead they will use some well known identifier for the region such as country 2 letter code, or geopolitical full name.  Names could be in a single language for the data or in the native language of the specific region.

Mapbox provides some mapping files between their identifiers and different possible values.  We would have to perform some mapping, either at the data/fusion level or in the chart, to match the IDs and know what polygon to color.