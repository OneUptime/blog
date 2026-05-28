# Validation Summary: Configure Cloud Run Traffic Splitting to Gradually Roll Out a New Revision

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI (`gcloud`)
- Cloud Run revisions and traffic tags
- Canary deployments and traffic splitting
- Cloud Logging
- Cloud Monitoring
- Bash scripting

## Sources Consulted
- Google Cloud Run: Rollbacks, gradual rollouts, and traffic migration - https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Google Cloud SDK: `gcloud run deploy` reference - https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK: `gcloud run services update-traffic` reference - https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- Google Cloud Run: Set session affinity for services - https://docs.cloud.google.com/run/docs/configuring/session-affinity
- Google Cloud Run: Invoke with an HTTPS request / service URL formats - https://docs.cloud.google.com/run/docs/triggering/https-request
- Google Cloud Observability: Request-response services and Cloud Run SLI metrics - https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics

## Issues Found
- The post said `--to-latest` makes the canary the default revision and removes the tag. Updated this to say it sends all traffic to the latest revision and restores default latest-revision routing for future deployments. Tag removal requires tag-specific flags such as `--remove-tags`.
- The rollback section said traffic stops immediately. Updated this because official Cloud Run docs state traffic routing adjustments are not instantaneous and in-flight requests continue during the transition.
- The automation script described a Cloud Logging query as a Cloud Monitoring check and used `--limit=1`, making the `ERROR_COUNT > 10` threshold unreachable. Updated it to query recent Cloud Logging entries for the specific canary revision with `--limit=100`.
- The monitoring section filtered `resource.labels.revision_name~"canary"`, but Cloud Run traffic tags are not necessarily part of revision names. Updated the example to resolve the tagged revision name from `status.traffic[tag=canary].revisionName` and filter logs by that exact revision name.
- The key reminders section incorrectly described Cloud Run traffic splitting as session-based by default. Updated it to explain that traffic splitting uses a random request split by default, while Cloud Run session affinity is optional, best-effort, and can affect traffic splitting when enabled.

## Review Notes
The remaining `gcloud run deploy`, `gcloud run services update-traffic`, `gcloud run revisions list`, `gcloud run services describe`, Cloud Logging, and Cloud Monitoring examples are consistent with current official documentation. The local environment did not provide usable `gcloud` help output, so command validation was performed against current Google Cloud CLI reference documentation.
