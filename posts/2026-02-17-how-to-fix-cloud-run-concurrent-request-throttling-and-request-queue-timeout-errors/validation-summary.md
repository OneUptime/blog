# Validation Summary: How to Fix Cloud Run Concurrent Request Throttling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring alerting policies
- Flask and aiohttp
- Node.js and Express
- hey load testing tool

## Sources Consulted
- Cloud Run maximum concurrent requests per instance: https://docs.cloud.google.com/run/docs/about-concurrency
- Cloud Run configure maximum concurrent requests: https://docs.cloud.google.com/run/docs/configuring/concurrency
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run maximum instances configuration: https://docs.cloud.google.com/run/docs/configuring/max-instances
- Cloud Run maximum instance limits: https://docs.cloud.google.com/run/docs/configuring/max-instances-limits
- Cloud Run minimum instances configuration: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Cloud Run CPU limits and startup CPU boost: https://docs.cloud.google.com/run/docs/configuring/services/cpu
- Cloud Run session affinity: https://docs.cloud.google.com/run/docs/configuring/session-affinity
- Cloud Run monitoring: https://docs.cloud.google.com/run/docs/monitoring
- Cloud Run request and latency metrics for SLOs: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- gcloud run services update reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The post stated that Cloud Run concurrency defaults to 80 without qualification. Current Cloud Run documentation says the default concurrency setting is 80, while new services created by Google Cloud CLI or Terraform can default to 80 times the number of vCPUs. Updated the wording to include that caveat.
- The post described the request queue timeout generically. Added the official pending request limit: up to 3.5 times the average startup time for the service, or 10 seconds, whichever is greater.
- The post stated that Cloud Run can scale up to 100 instances by default. Current documentation distinguishes revision-level maximum instances, which default to 100, from service-level maximum instances and quota-based limits. Updated the wording to avoid conflating these settings.
- The "Check your current scaling behavior" command only reads the revision-level maxScale annotation; it does not show instance count over time. Updated the surrounding text and comment to describe the command accurately.
- The monitoring section labeled `status.traffic` as the current instance count. That field is the traffic split, not instance count. Updated the comment to say current traffic split.
- The session affinity explanation implied stronger routing guarantees than Cloud Run provides. Updated it to describe cookie-based, best-effort routing for sequential requests from the same client.
- The alerting policy example used `metric.labels.response_code_class`, but Monitoring filters use `metric.label."response_code_class"`. It also omitted a threshold predicate and duration. Updated the filter and added `--if='> 0'` and `--duration=60s`.

## Review Notes
The workspace does not have `gcloud` installed, so CLI checks were performed against official Google Cloud SDK documentation instead of local `--help` output. The 5xx alert example is technically valid as a broad Cloud Run failure signal, but it is not specific to queue timeout failures; a future improvement would be a logs-based alert that matches the exact queue timeout log text emitted in the target environment.
