# Validation Summary: How to Filter Eventarc Triggers by Event Attributes and Resource Paths

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Eventarc Standard
- Cloud Audit Logs
- Cloud Run event destinations
- Cloud Storage direct events
- Google Cloud CLI (`gcloud`)
- CloudEvents HTTP headers
- Node.js / Express

## Sources Consulted
- Google Cloud Eventarc: gcloud eventarc triggers create: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Google Cloud Eventarc: Determine event filters for Cloud Audit Logs: https://docs.cloud.google.com/eventarc/docs/determining-filters-cal
- Google Cloud Eventarc: Understand path patterns: https://docs.cloud.google.com/eventarc/docs/path-patterns
- Google Cloud Eventarc: Manage triggers: https://docs.cloud.google.com/eventarc/docs/managing-triggers
- Google Cloud Eventarc: Event routes: https://docs.cloud.google.com/eventarc/standard/docs/run/event-routing-options
- Google Cloud Eventarc: Event format: https://docs.cloud.google.com/eventarc/standard/docs/event-format
- Google Cloud Eventarc: Supported event types: https://cloud.google.com/eventarc/docs/reference/supported-events
- Google Cloud Eventarc: Understand locations: https://cloud.google.com/eventarc/docs/understand-locations
- BigQuery audit logs overview: https://cloud.google.com/bigquery/docs/reference/auditlogs/

## Issues Found
- The post described path pattern filtering as generally supported without noting its current launch stage. Updated the path pattern introduction to state that resourceName path patterns apply to Cloud Audit Logs events and are currently Preview.
- The BigQuery dataset path pattern used `/projects/my-project/datasets/sensitive-data/*`, which would match child path segments rather than the specific dataset stated in the example. Updated it to `/projects/my-project/datasets/sensitive-data`.
- The Storage wildcard example used `prod-**`, which is not valid Eventarc path pattern syntax because `**` must be used as a multi-segment wildcard expression, not embedded inside a name segment. Updated the example to use `prod-*` for the bucket segment and `**` as the object-path segment.
- The post stated that trigger filters cannot be updated and recommended deleting and recreating the trigger. Current Eventarc documentation allows updating some event filters, while the event `type` cannot be changed. Updated the example to use `gcloud eventarc triggers update` and mention the event type limitation.

## Review Notes
The Cloud Storage direct-event examples are technically valid, but in real deployments the trigger location must match the Cloud Storage bucket location. The sample leaves the bucket location implicit.
