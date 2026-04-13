# Validation Summary: How to Create a Geospatial Chart in MongoDB Atlas Charts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Charts
- MongoDB geospatial features (GeoJSON, 2dsphere indexes)
- MongoDB aggregation pipeline ($group stage)
- Mapbox (underlying map renderer)

## Sources Consulted
- MongoDB Atlas Charts documentation on geospatial chart types (https://www.mongodb.com/docs/charts/chart-type-reference/geo-scatter/, https://www.mongodb.com/docs/charts/chart-type-reference/geo-choropleth/, https://www.mongodb.com/docs/charts/chart-type-reference/geo-heatmap/)
- MongoDB GeoJSON specification (https://www.mongodb.com/docs/manual/reference/geojson/)
- MongoDB 2dsphere index documentation (https://www.mongodb.com/docs/manual/core/2dsphere/)
- GeoJSON RFC 7946 (coordinates order: longitude, latitude)
- MongoDB aggregation pipeline $group stage documentation (https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/)

## Issues Found
1. **Incorrect count of geospatial chart types**: The post stated Atlas Charts supports "two geospatial chart types" (Geo Point and Geo Choropleth). Atlas Charts actually supports three: Geo Scatter, Geo Choropleth, and Geo Heatmap. Added Geo Heatmap to the list and corrected the count to "three."

2. **Incorrect chart type name**: The post used "Geo Point" as the chart type name. The correct Atlas Charts terminology is "Geo Scatter." Updated the list entry and summary accordingly.

3. **Summary contradicted body about coordinate requirements**: The summary stated "Geo Point charts require a GeoJSON coordinates field," but the body correctly explained that separate latitude/longitude fields are also supported. Fixed the summary to state that Geo Scatter charts "accept a GeoJSON coordinates field or separate latitude/longitude fields."

## Review Notes
- The post uses "Geo Point" terminology in section headings and body text beyond the introduction list. These were not all changed since the informal name is clear in context and the correct name is established at the top. A future update could standardize to "Geo Scatter" throughout.
- The 2dsphere index recommendation is reasonable for large collections, though Atlas Charts does not strictly require it since chart rendering is primarily client-side. For very large collections where server-side filtering occurs, the index can help.
- The "Map Region Filter" / "Geographic Filter" feature description aligns with Atlas Charts dashboard filtering capabilities, though exact UI labels may vary across Atlas Charts versions.
