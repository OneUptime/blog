# Validation Summary: How to Build a Heatmap of Customer Locations with Google Maps Platform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Maps JavaScript API
- deck.gl HeatmapLayer and GoogleMapsOverlay
- BigQuery GIS / geography functions
- Google Cloud Functions for Python
- Python BigQuery client library
- JavaScript, HTML, and SQL

## Sources Consulted
- Google Maps JavaScript API Heatmap Layer documentation: https://developers.google.com/maps/documentation/javascript/heatmaplayer
- Google Maps JavaScript API deck.gl integration example: https://developers.google.com/maps/documentation/javascript/examples/deckgl-heatmap
- Google Maps JavaScript API Advanced Markers documentation: https://developers.google.com/maps/documentation/javascript/advanced-markers/overview
- deck.gl HeatmapLayer documentation: https://deck.gl/docs/api-reference/aggregation-layers/heatmap-layer
- deck.gl GoogleMapsOverlay documentation: https://deck.gl/docs/api-reference/google-maps/google-maps-overlay
- BigQuery geography functions documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/geography_functions
- BigQuery parameterized queries documentation: https://cloud.google.com/bigquery/docs/parameterized-queries
- Google Cloud Functions Python HTTP functions documentation: https://cloud.google.com/functions/docs/writing/http

## Issues Found
- The post used Google Maps JavaScript API `google.maps.visualization.HeatmapLayer`, which Google deprecated in May 2025 and scheduled to become unavailable in the May 2026 Maps JavaScript API release. I replaced the frontend heatmap with deck.gl `HeatmapLayer` rendered through `GoogleMapsOverlay`, and removed the `libraries=visualization` loader parameter.
- The BigQuery examples used `ST_SNAPTOGRID(..., 0.005)` and `ST_SNAPTOGRID(..., 0.05)`. BigQuery rounds the grid size argument to `10^n`, so those values do not create the stated grid sizes. I changed them to supported power-of-ten grid sizes and updated the distance comment.
- The multi-resolution BigQuery tables omitted `new_customers_90d`, but the API allowed selecting the `new_customers` metric for every zoom level. I added `new_customers_90d` to the coarse and fine tables.
- The coarse and fine grid examples filtered only `lat IS NOT NULL` while using both latitude and longitude. I added `lng IS NOT NULL` to avoid invalid/null point generation.
- The API converted `row.weight` with `float(row.weight)`, which could fail when `SUM(lifetime_value)` returns `NULL`. I wrapped the selected weight column with `COALESCE(..., 0)`.
- The competitor marker example used deprecated `google.maps.Marker` and called the heatmap API with an unsupported `type=competitors` parameter. I changed it to use `AdvancedMarkerElement` and a separate competitor API placeholder.
- The post described grid bucketing as clustering in places. I updated those references to "grid bucketing" to match the SQL actually shown.

## Review Notes
The viewport filtering is suitable for normal map bounds but does not handle antimeridian-crossing bounds. That is an edge case for a customer-location heatmap centered on a regional market, but a production global map should handle `west > east` separately.
