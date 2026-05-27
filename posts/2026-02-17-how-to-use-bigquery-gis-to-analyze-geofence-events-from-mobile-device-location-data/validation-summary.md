# Validation Summary: Use BigQuery GIS to Analyze Geofence Events from Mobile Device Location Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery GIS / GEOGRAPHY functions
- BigQuery partitioned and clustered tables
- BigQuery window functions
- BigQuery timestamp functions
- Google Cloud Pub/Sub
- Google Cloud Dataflow
- Mobile location analytics and geofencing

## Sources Consulted
- BigQuery geography functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/geography_functions
- BigQuery timestamp functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- BigQuery window functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/window-functions
- BigQuery navigation functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/navigation_functions
- BigQuery query syntax: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- BigQuery partitioned tables: https://cloud.google.com/bigquery/docs/creating-partitioned-tables
- BigQuery clustered tables: https://cloud.google.com/bigquery/docs/clustered-tables
- Google Cloud Sensitive Data Protection pseudonymization: https://cloud.google.com/sensitive-data-protection/docs/pseudonymization

## Issues Found
- The geofence entry/exit query used `ST_CONTAINS`, which excludes points on a polygon boundary. Changed it to `ST_COVERS` so a point exactly on the geofence boundary is treated as inside the geofence.
- The geofence entry/exit query used an `ST_DWITHIN` prefilter that could omit the first outside ping after a device left a geofence, causing missed `EXIT` events. Removed that prefilter from the state-transition query and updated the summary wording accordingly.
- The dwell-time query assumed the next event after an `ENTER` was an exit. Added `LEAD(event_type)` and required `next_event_type = 'EXIT'` before calculating dwell time.
- The hourly foot-traffic query ordered grouped results with `FORMAT_TIMESTAMP('%A', entry_time)` even though `entry_time` was not grouped or aggregated in the `ORDER BY` expression. Replaced it with an aggregate day-order expression based on `MIN(EXTRACT(DAYOFWEEK FROM entry_time))`.

## Review Notes
The examples are syntactically aligned with current GoogleSQL documentation after the fixes. For production-scale use, the state-transition query may need a more selective candidate-generation strategy than a full cross join, but that optimization must preserve outside-geofence pings so exit events are not lost.
