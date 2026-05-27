# Validation Summary: How to Visualize BigQuery GIS Query Results on Google Maps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery GIS / GoogleSQL geography functions
- Cloud Run functions / Cloud Functions Gen 2
- Python Functions Framework
- Google Cloud BigQuery Python client
- Google Maps JavaScript API Data layer
- deck.gl HeatmapLayer and GoogleMapsOverlay
- GeoJSON

## Sources Consulted
- BigQuery geography functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/geography_functions
- gcloud functions deploy reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud Run functions Python runtime support: https://docs.cloud.google.com/functions/docs/runtime-support
- Cloud Run functions Python dependencies: https://cloud.google.com/run/docs/runtimes/python-dependencies
- Maps JavaScript API Data reference: https://developers.google.com/maps/documentation/javascript/reference/data
- Maps JavaScript API Heatmap Layer deprecation and replacement guidance: https://developers.google.com/maps/documentation/javascript/heatmaplayer
- Maps JavaScript API deck.gl overlay guidance: https://developers.google.com/maps/documentation/javascript/deckgl-overlay-view
- Google Maps and deck.gl HeatmapLayer sample: https://developers.google.com/maps/documentation/javascript/examples/deckgl-heatmap
- deck.gl HeatmapLayer API reference: https://deck.gl/docs/api-reference/aggregation-layers/heatmap-layer
- deck.gl GoogleMapsOverlay API reference: https://deck.gl/docs/api-reference/google-maps/google-maps-overlay

## Issues Found
- The frontend used `google.maps.visualization.HeatmapLayer`, which Google deprecated in May 2025 and says will become unavailable in a later Maps JavaScript API version releasing in May 2026. Updated the example to use deck.gl's `HeatmapLayer` with `GoogleMapsOverlay`, matching Google's replacement guidance.
- The HTML loaded the deprecated Maps `visualization` library only for the heatmap. Removed that library parameter and added deck.gl script tags needed by the replacement heatmap implementation.
- The "Coverage Areas" button called `toggleLayer('coverage')`, but the code did not implement any `coverage` layer loader. Added `loadCoverageAreas()` to fetch the existing `coverage` API type, render the returned GeoJSON with `google.maps.Data`, and toggle it correctly.
- The detailed info window snippet called `feature.getProperties()`, which is not a method on `google.maps.Data.Feature`. Replaced it with `feature.forEachProperty(...)`, which is the documented API for iterating feature properties.
- The choropleth helper name was misspelled as `applyChoropethStyle`. Corrected the function and usage to `applyChoroplethStyle`.
- The Cloud Function imports `google.cloud.bigquery`, but the deployment instructions did not include the required Python dependency declaration. Added a minimal `requirements.txt` snippet with `google-cloud-bigquery`.
- The Step 4 heading and code comment claimed the info window included charts, but the snippet only rendered text and table details. Updated the wording to "Details" to match the actual implementation.

## Review Notes
- The `gcloud` CLI was not installed in the local environment, so the deploy command was verified against the official Google Cloud SDK reference instead of local `gcloud --help`.
- The example still uses placeholder project, dataset, table, and API key values. Those are appropriate for a tutorial but must be replaced before deployment.
- The public unauthenticated function and permissive CORS header are acceptable for a simple tutorial, but production systems should restrict access and origins.
