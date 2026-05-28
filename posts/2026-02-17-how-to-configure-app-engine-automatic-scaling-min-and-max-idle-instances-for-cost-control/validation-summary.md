# Validation Summary: How to Configure App Engine Automatic Scaling Min and Max Idle Instances

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud App Engine standard environment
- App Engine automatic scaling
- App Engine `app.yaml`
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud App Engine `app.yaml` reference: https://docs.cloud.google.com/appengine/docs/standard/reference/app-yaml
- Google Cloud App Engine instance management documentation: https://docs.cloud.google.com/appengine/docs/standard/how-instances-are-managed
- Google Cloud App Engine pricing documentation: https://cloud.google.com/appengine/pricing
- Google Cloud SDK reference for `gcloud app instances list`: https://docs.cloud.google.com/sdk/gcloud/reference/app/instances/list
- Google Cloud SDK reference for `gcloud monitoring dashboards list`: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/list

## Issues Found
- Corrected the description of `min_idle_instances`. The original post described it as a minimum total number of instances kept warm at all times. The official App Engine documentation defines it as the number of additional idle instances kept running beyond the number App Engine calculates are needed for current traffic.
- Added the warmup request caveat for `min_idle_instances`, because the official documentation warns that warmup requests must be enabled and handled for this feature to function properly.
- Clarified that `min_idle_instances: 0` means no extra idle instances are kept, and that scaling to zero depends on the default minimum instance count behavior.
- Corrected the `max_idle_instances` explanation to note that idle instances can temporarily exceed the configured maximum while App Engine settles after a spike, and that excess idle instances beyond the configured maximum are not billed.
- Softened absolute cold-start claims such as "guarantees" and "never see a cold start" because App Engine scaling and warmup behavior are not absolute guarantees in the official documentation.
- Updated the pricing section to clarify that the listed rates apply after the free tier and are region-specific, using Iowa (`us-central1`) pricing from the official pricing table.
- Updated the `max_instances` section to mention the current default of 20 instances for new App Engine standard projects created after March 2025.
- Corrected the `max_pending_latency` description from "will definitely start a new one" to "will try to start a new one," matching the official documentation.

## Review Notes
The configuration field names and YAML structure are valid for App Engine standard automatic scaling. The Cloud CLI commands shown are current, but the local environment did not have `gcloud` installed, so command validation was performed against the official Google Cloud SDK reference.
