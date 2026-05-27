# Validation Summary: How to Run Geospatial Analytics on Google Maps Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery GEOGRAPHY data type
- BigQuery geography functions: ST_GEOGPOINT, ST_DISTANCE, ST_DWITHIN, ST_BUFFER, ST_AREA, ST_INTERSECTION, ST_INTERSECTS
- BigQuery public datasets
- Google Maps Geocoding API
- Google Maps Services Python client
- Google Cloud BigQuery Python client

## Sources Consulted
- BigQuery geography functions documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/geography_functions
- BigQuery GEOGRAPHY data type documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-types#geography_type
- BigQuery geospatial data documentation: https://docs.cloud.google.com/bigquery/docs/geospatial-data
- BigQuery spatial analysis best practices: https://docs.cloud.google.com/bigquery/docs/best-practices-spatial-analysis
- BigQuery public datasets documentation: https://cloud.google.com/bigquery/public-data
- Google Cloud blog example using census ACS and geo_census_blockgroups public datasets: https://cloud.google.com/blog/products/data-analytics/new-geospatial-data-comes-to-bigquery-public-datasets-with-carto-collaboration
- Google Maps Services Python client documentation: https://googlemaps.github.io/google-maps-services-python/docs/
- Google Cloud BigQuery Python Client.insert_rows_json documentation: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client#google_cloud_bigquery_client_Client_insert_rows_json

## Issues Found
- The post described BigQuery GEOGRAPHY as "spherical geometry on the WGS84 reference ellipsoid." Updated this to match BigQuery documentation: GEOGRAPHY represents a point set on the WGS84 reference spheroid with geodesic edges.
- The prerequisites and Step 4 heading referred to "Google Maps public datasets." Updated these references to "BigQuery public datasets," because the examples use BigQuery public datasets rather than Google Maps public datasets.
- The census example said it was finding "population density" but only summed population. Updated the comment to "population."
- The census geography table reference used `bigquery-public-data.geo_census_blockgroups.blockgroups_10`, which was not the table name used in Google's public BigQuery GIS census example. Updated it to `bigquery-public-data.geo_census_blockgroups.us_blockgroups_national`.
- The geocoding section said the SQL example used a UDF that calls the Google Maps Geocoding API, but the snippet is a lookup-table pattern. Updated the explanation to match the code.
- The Python geocoding sample accepted `project_id` but did not use it. Updated the BigQuery client construction to `bigquery.Client(project=project_id)`.
- The performance section claimed `ST_DWITHIN` uses "spatial indexing." BigQuery documentation describes clustering on GEOGRAPHY columns and optimized spatial predicates/joins, not a user-facing spatial index. Updated the wording in the optimization example and summary.

## Review Notes
The SQL examples were reviewed for GoogleSQL syntax and current BigQuery geography function usage. Queries were not executed against BigQuery in this environment because the BigQuery CLI is not installed and no authenticated BigQuery project was available.
