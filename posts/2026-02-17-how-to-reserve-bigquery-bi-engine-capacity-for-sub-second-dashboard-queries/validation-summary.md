# Validation Summary: How to Reserve BigQuery BI Engine Capacity for Sub-Second Dashboard Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery BI Engine
- BigQuery Reservation API
- bq CLI
- BigQuery INFORMATION_SCHEMA
- Looker Studio
- Looker / LookML

## Sources Consulted
- Google Cloud BigQuery BI Engine introduction: https://cloud.google.com/bigquery/docs/bi-engine-intro
- Google Cloud BI Engine capacity reservation guide: https://cloud.google.com/bigquery/docs/bi-engine-reserve-capacity
- Google Cloud BI Engine monitoring guide: https://cloud.google.com/bigquery/docs/bi-engine-monitor
- Google Cloud INFORMATION_SCHEMA.BI_CAPACITIES reference: https://cloud.google.com/bigquery/docs/information-schema-bi-capacities
- Google Cloud INFORMATION_SCHEMA.JOBS reference: https://cloud.google.com/bigquery/docs/information-schema-jobs
- Google Cloud BigQuery Reservation API BiReservation reference: https://cloud.google.com/bigquery/docs/reference/reservations/rest/v1/BiReservation
- Google Cloud BigQuery Reservation API updateBiReservation method: https://cloud.google.com/bigquery/docs/reference/reservations/rest/v1/projects.locations/updateBiReservation
- Google Cloud BI Engine with Looker guide: https://cloud.google.com/bigquery/docs/looker

## Issues Found
- The post used non-existent `gcloud bq bi-engine-reservations` commands. Replaced them with the documented `bq update --reservation --bi_reservation_size` syntax.
- The REST example used `POST` to create a BI reservation. Updated it to use the documented `PATCH .../biReservation?updateMask=size` endpoint because the BI reservation is a singleton that is updated from size 0.
- The reservation status example used an invalid `gcloud` describe command. Replaced it with a query against `INFORMATION_SCHEMA.BI_CAPACITIES`.
- The job statistics query used `INFORMATION_SCHEMA.JOBS` and described `bi_engine_mode` values as `FULL`, `PARTIAL`, and `DISABLED`. Updated the query to use `JOBS_BY_PROJECT`, report `acceleration_mode`, and describe the current values `FULL_QUERY`, `FULL_INPUT`, `PARTIAL_INPUT`, and `BI_ENGINE_DISABLED`.
- The post claimed INFORMATION_SCHEMA could show which tables were cached and how much memory each consumed. Changed the wording to say the query shows whether recent queries used BI Engine acceleration.
- The Looker Studio reservation-project wording implied the reservation must be in the data source project. Adjusted it to refer to the project billed for BigQuery queries and the query region.
- The aggregation guidance stated standard aggregations are always fully accelerated. Changed it to say they are good candidates when the rest of the query is supported.
- Updated BI Engine capacity units from GB to GiB where the examples refer to reservation memory, matching the official documentation.

## Review Notes
The post is technically valid after these corrections. Future improvements could mention BI Engine preferred tables and Cloud Monitoring `bigquerybiengine` metrics for capacity utilization, but those additions were outside the scope of correcting technical errors.
