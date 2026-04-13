# Validation Summary: How to Set Up Atlas Alerts and Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (cloud database platform)
- MongoDB Atlas Admin API v1.0 (alert configurations, alert acknowledgement)
- Slack (incoming webhooks / API token integration)
- PagerDuty (Events API v2 integration)

## Sources Consulted
- MongoDB Atlas Administration API v1.0 documentation for Alert Configurations: https://www.mongodb.com/docs/atlas/reference/api/alert-configurations-create-config/
- MongoDB Atlas Administration API v1.0 documentation for Alerts: https://www.mongodb.com/docs/atlas/reference/api/alerts-acknowledge-alert/
- MongoDB Atlas documentation on configuring alert settings: https://www.mongodb.com/docs/atlas/configure-alerts/
- MongoDB Atlas documentation on third-party notification integrations (Slack, PagerDuty): https://www.mongodb.com/docs/atlas/tutorial/third-party-service-integrations/

## Issues Found

1. **Incorrect Slack notification field names (lines 62-63)**: The blog used `slackApiToken` and `slackChannelName` as field names in the Atlas API request body. The correct Atlas Admin API v1.0 field names for SLACK-type notifications are `apiToken` and `channelName`. Also changed the empty string value for `apiToken` to a placeholder `<your-slack-api-token>` for clarity, and removed the `#` prefix from the channel name since the API expects the bare channel name (`db-alerts`, not `#db-alerts`).

2. **Incorrect eventTypeName and threshold structure (lines 59, 66-69)**: The blog used `"eventTypeName": "HOST_HIGH_MEMORY"` with a generic `threshold` object. `HOST_HIGH_MEMORY` is not a valid `eventTypeName` for creating alert configurations via the API. For metric-based host alerts, the correct `eventTypeName` is `"OUTSIDE_METRIC_THRESHOLD"`, paired with a `metricThreshold` object that includes `metricName`, `operator`, `threshold`, `units`, and `mode` fields. Changed to use `metricName: "SYSTEM_MEMORY_PERCENT_USED"` with `mode: "AVERAGE"` to correctly represent a high memory usage alert.

## Review Notes
- The blog uses the Atlas Admin API v1.0 (`/api/atlas/v1.0/`). MongoDB has been transitioning to the v2 API (`/api/atlas/v2/`). The v1.0 endpoints still work but may eventually be deprecated. A future update could migrate the examples to the v2 API.
- The Slack integration via `apiToken` (legacy Slack API token) is a legacy approach. MongoDB Atlas now recommends using webhook-based Slack integrations configured through Atlas third-party integrations. The API example still functions but users should be aware of the newer webhook approach.
- The default alert thresholds in the built-in policies table are approximate and may vary as MongoDB updates default configurations. The values listed are reasonable and representative.
- The alert acknowledgement API example is correct in structure and field names.
- The PagerDuty setup instructions are accurate for the Events API v2 integration flow.
