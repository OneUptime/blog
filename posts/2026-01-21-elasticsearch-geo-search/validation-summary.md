# Validation Summary: How to Implement Geo Search in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Elasticsearch Query DSL
- Elasticsearch geo_point mappings
- Elasticsearch geo_shape mappings
- Elasticsearch geo queries
- Elasticsearch geo aggregations
- Elasticsearch geo distance sorting

## Sources Consulted
- Elasticsearch Reference: Geopoint field type - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/geo-point
- Elasticsearch Reference: Geoshape field type - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/geo-shape
- Elasticsearch Reference: Geo-distance query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-geo-distance-query
- Elasticsearch Reference: Geo-bounding box query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-geo-bounding-box-query
- Elasticsearch Reference: Geo-polygon query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-geo-polygon-query
- Elasticsearch Reference: Geoshape query - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-geo-shape-query
- Elasticsearch Reference: Sort search results, geo distance sorting - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/sort-search-results
- Elasticsearch Reference: Geo-distance aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geodistance-aggregation
- Elasticsearch Reference: Geohash grid aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geohashgrid-aggregation
- Elasticsearch Reference: Geotile grid aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geotilegrid-aggregation
- Elasticsearch Reference: Geo-centroid aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-geocentroid-aggregation
- Elasticsearch Reference: Geo-bounds aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-geobounds-aggregation

## Issues Found
- The initial `stores` mapping did not define fields used later in the complete store locator example. I added `phone`, `hours`, `services`, and `is_open` mappings so the later term filters, terms aggregation, and `_source` fields are consistent with the index schema.
- The `geo_polygon` query example used an API that Elasticsearch marks as deprecated since 7.12. I replaced it with a `geo_shape` polygon query against the `geo_point` field, using GeoJSON-style `[lon, lat]` coordinate ordering and a closed polygon ring.
- The geo shape indexing example used `"type": "circle"`, but current Elasticsearch `geo_shape` does not support GeoJSON or WKT circles directly. I changed the example to an `envelope`, which Elasticsearch supports for bounding rectangles.
- The shape relation descriptions for `within` and `contains` were reversed. I corrected them so `within` means the indexed shape is inside the query shape, and `contains` means the indexed shape contains the query shape.

## Review Notes
The remaining geo point formats, distance query options, bounding box formats, distance sorting, script distance calculation, and geo aggregation examples align with current Elasticsearch documentation. For map tile visualization, `geotile_grid` is usually the more direct choice for web maps, while `geohash_grid` remains valid for grid-based geo bucketing.
