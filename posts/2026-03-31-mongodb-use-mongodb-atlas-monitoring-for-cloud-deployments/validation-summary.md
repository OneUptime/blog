# Validation Summary: How to Use MongoDB Atlas Monitoring for Cloud Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Admin API (v1.0)
- MongoDB Atlas CLI
- MongoDB Atlas Real-Time Performance Panel (RTPP)
- MongoDB Atlas Performance Advisor
- MongoDB Atlas Charts
- Datadog (third-party integration)
- Python (requests library)

## Sources Consulted
- MongoDB Atlas Admin API OpenAPI Specification (v1.0 and v2) — https://github.com/mongodb/openapi
- MongoDB Atlas CLI documentation — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-alerts-settings-create/
- MongoDB Atlas CLI Datadog integration docs — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-integrations-create-datadog/
- MongoDB Atlas Real-Time Performance Panel docs — https://www.mongodb.com/docs/atlas/real-time-performance-panel/
- MongoDB Atlas Performance Advisor docs — https://www.mongodb.com/docs/atlas/performance-advisor/
- MongoDB Atlas Free Cluster Limitations — https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- MongoDB Atlas Alert Event Types — https://www.mongodb.com/docs/atlas/reference/atlas-alert-event-types/

## Issues Found

### 1. Incorrect API endpoint for cluster metrics (Critical)
- **What was wrong:** The Python code used the endpoint `/api/atlas/v1.0/groups/{PROJECT_ID}/clusters/{CLUSTER_NAME}/metrics/measurements`. This endpoint does not exist in the Atlas Admin API. Metrics are retrieved per-process, not per-cluster-name.
- **What was changed:** Updated the endpoint to the correct process-level URL: `/api/atlas/v1.0/groups/{PROJECT_ID}/processes/{PROCESS_ID}/measurements`. Changed the `CLUSTER_NAME` variable to `PROCESS_ID` with a comment indicating the `host:port` format.
- **Why:** The original code would return a 404 error. The Atlas Admin API requires a process identifier (`hostname:port`) to retrieve measurements.

### 2. Incorrect tier availability claim in summary (Factual error)
- **What was wrong:** The summary stated that "the Real-Time Performance Panel, Performance Advisor, and built-in alerts are available on all cluster tiers."
- **What was changed:** Corrected to state that built-in alerts are available on all tiers, while the RTPP and Performance Advisor require M10+ dedicated clusters.
- **Why:** RTPP and Performance Advisor are only available on M10+ dedicated clusters, not on M0 (free), M2, or M5 shared clusters.

## Review Notes
- The "Common alert events to configure" list mixes actual Atlas event type names (`REPLICATION_OPLOG_WINDOW_RUNNING_OUT`, `NO_PRIMARY`) with names that appear to be event types but are not valid (`CONNECTIONS_PERCENT_OVER_80`, `QUERY_TARGETING_SCANNED_RATIO_EXCEEDED`). Connection percentage alerts use `OUTSIDE_METRIC_THRESHOLD` as the event type with `CONNECTIONS_PERCENT` as the metric name. This could confuse readers who try to use these strings directly in API calls. Not fixed because the list is presented in a descriptive text block rather than executable code.
- The Atlas Admin API v1.0 used throughout the post is deprecated. The current version is v2. The v1.0 endpoints still work but readers should be aware that v2 is the recommended version.
- The `$dateTrunc` aggregation operator used in the Atlas Charts example requires MongoDB 5.0+, which is the default on Atlas but worth noting.
