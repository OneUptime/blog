# Validation Summary: How to Build an IoT Alerting System with Pub/Sub Cloud Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Cloud Run functions / Cloud Functions gen2
- Python
- Firestore
- Slack incoming webhooks
- PagerDuty Events API v2

## Sources Consulted
- Google Cloud Pub/Sub topic creation docs: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud Pub/Sub publish command docs: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/publish
- Google Cloud Functions deployment docs: https://cloud.google.com/functions/docs/deploy
- Cloud Run functions deployment prerequisites: https://cloud.google.com/run/docs/deploy-functions
- Cloud Run functions Python dependency docs: https://cloud.google.com/functions/docs/writing/specifying-dependencies-python
- Cloud Run functions Pub/Sub CloudEvent sample: https://docs.cloud.google.com/functions/docs/running/direct
- Firestore database creation docs: https://docs.cloud.google.com/firestore/native/docs/create-database-server-client-library
- Google Cloud Pub/Sub Python publisher docs: https://docs.cloud.google.com/pubsub/docs/publisher
- Firestore Python `FieldFilter` docs: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.base_query.FieldFilter
- Google Cloud Python client project configuration docs: https://cloud.google.com/python/docs/reference/google-cloud-core/latest/config
- Slack incoming webhook docs: https://api.slack.com/messaging/webhooks
- PagerDuty event management and Events API v2 guidance: https://support.pagerduty.com/main/docs/event-management

## Issues Found
- The post described Cloud Monitoring custom metrics and alert-policy notification delivery, but the code did not create custom metrics or Monitoring alert policies. I changed the description, tags, prerequisites, architecture diagram, and intro wording to accurately describe direct Slack/PagerDuty routing through Cloud Functions.
- The architecture diagram used `Pub/Sub: alerts`, while the commands and code used `sensor-alerts`. I updated the diagram to use `sensor-alerts`.
- The infrastructure commands created an unused `alert-resolved` topic and an unused `sensor-alerts-sub` subscription. The Cloud Functions Pub/Sub trigger creates its own backing trigger resources, so I removed those unused commands.
- The alert rules included a `device-offline` rule with condition `missing`, but the per-message evaluator only supports value comparisons and cannot detect absent heartbeats without a scheduled scan. I removed that rule from the example.
- The evaluator hard-coded `PROJECT_ID = "your-project-id"`. I changed it to use the Firestore client's discovered project ID.
- The Firestore query used positional `where()` arguments. I updated it to use `FieldFilter` with the `filter=` keyword, matching the current Python client API.
- The router hard-coded Slack and PagerDuty secrets. I changed them to environment variables and added the corresponding `--set-env-vars` deploy flag.
- The deployment commands omitted `--source` even though the examples place each function in its own directory. I added `--source=alert_evaluator` and `--source=alert_router`.
- The post did not mention Python `requirements.txt` files. I added minimal dependency lists required by the sample functions.
- The prerequisites did not mention the supporting APIs used by Cloud Functions gen2 or that Firestore needs an initialized database. I expanded the prerequisite list.

## Review Notes
The corrected tutorial is technically coherent as a direct Pub/Sub and Cloud Functions alerting flow. A future version could add actual Cloud Monitoring integration by writing custom metrics and creating alert policies, but that would be a separate implementation path.
