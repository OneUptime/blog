# Validation Summary: How to Publish and Subscribe to Shared Datasets Using BigQuery Analytics Hub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery sharing / Analytics Hub
- Analytics Hub REST API
- GoogleSQL
- Cloud Audit Logs
- IAM roles and policies

## Sources Consulted
- Google Cloud: Introduction to BigQuery sharing - https://docs.cloud.google.com/bigquery/docs/analytics-hub-introduction
- Google Cloud: Manage data exchanges in BigQuery sharing - https://docs.cloud.google.com/bigquery/docs/analytics-hub-manage-exchanges
- Google Cloud: Manage listings in BigQuery sharing - https://docs.cloud.google.com/bigquery/docs/analytics-hub-manage-listings
- Google Cloud: View and subscribe to listings and data exchanges - https://docs.cloud.google.com/bigquery/docs/analytics-hub-view-subscribe-listings
- Google Cloud: Manage subscriptions in BigQuery sharing - https://docs.cloud.google.com/bigquery/docs/analytics-hub-manage-subscriptions
- Analytics Hub API: projects.locations.dataExchanges.create - https://docs.cloud.google.com/bigquery/docs/reference/analytics-hub/rest/v1/projects.locations.dataExchanges/create
- Analytics Hub API: projects.locations.dataExchanges.listings.create - https://docs.cloud.google.com/bigquery/docs/reference/analytics-hub/rest/v1/projects.locations.dataExchanges.listings/create
- Analytics Hub API: projects.locations.dataExchanges.listings.subscribe - https://docs.cloud.google.com/bigquery/docs/reference/analytics-hub/rest/v1/projects.locations.dataExchanges.listings/subscribe
- Analytics Hub API: projects.locations.dataExchanges.listings.setIamPolicy - https://docs.cloud.google.com/bigquery/docs/reference/analytics-hub/rest/v1/projects.locations.dataExchanges.listings/setIamPolicy
- Analytics Hub API: projects.locations.subscriptions.delete and revoke - https://docs.cloud.google.com/bigquery/docs/reference/analytics-hub/rest/v1/projects.locations.subscriptions/delete and https://docs.cloud.google.com/bigquery/docs/reference/analytics-hub/rest/v1/projects.locations.subscriptions/revoke

## Issues Found
- The post used `gcloud bigquery analytics-hub ...` commands that are not documented in the current official Google Cloud references. Replaced those examples with official Analytics Hub REST API `curl` calls using documented endpoints and JSON fields.
- The listing creation examples used CLI-style flags such as `--bigquery-dataset`, `--request-access-email`, and `--restricted-export-config`. Replaced them with the documented REST fields: `bigqueryDataset.dataset`, `requestAccess`, and `restrictedExportPolicy`.
- The subscription example used a non-documented `--destination-dataset` flag. Replaced it with the documented `destinationDataset.datasetReference` and `location` request body.
- The IAM examples implied add/remove binding semantics. Updated them to use `setIamPolicy` and added a warning that the caller should start from the current policy before changing bindings.
- The revocation example used subscription deletion for a publisher revocation workflow. Replaced it with the documented `subscriptions:revoke` API call.
- The update example attempted to `INSERT` into `sales_analytics.daily_metrics`, which the post had created as a view. Changed the example to insert into the underlying source table so subscribers see the updated view results.
- The best-practice note said view-backed sharing lets publishers change the underlying schema without breaking subscribers. Clarified that this only holds when the exposed view schema stays compatible.

## Review Notes
The post is technically relevant and valid after corrections. The current Google documentation refers to the product as BigQuery sharing, formerly Analytics Hub; the post title and terminology remain understandable but could be updated in a broader editorial pass.
