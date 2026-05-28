# Validation Summary: How to Use Progressive Rollout Policies Based on Error Budget Consumption on GCP

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Platform
- Cloud Run
- Cloud Deploy
- Cloud Monitoring SLOs and error budgets
- Python
- Cloud Functions Functions Framework
- BigQuery SQL
- Mermaid diagrams

## Sources Consulted
- Google Cloud Run Admin API v2 Service and TrafficTarget reference: https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services
- Google Cloud Run rollbacks, gradual rollouts, and traffic migration: https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Google Cloud Run Python ServicesClient reference: https://docs.cloud.google.com/python/docs/reference/run/latest/google.cloud.run_v2.services.services.ServicesClient
- Google Cloud Run Python UpdateServiceRequest reference: https://docs.cloud.google.com/python/docs/reference/run/latest/google.cloud.run_v2.types.UpdateServiceRequest
- Google Cloud Run REST endpoint reference: https://docs.cloud.google.com/run/docs/reference/rest
- Google Cloud Deploy configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy canary deployments to Cloud Run: https://docs.cloud.google.com/deploy/docs/deployment-strategies/canary/cloud-run
- Google Cloud Deploy canary quickstart: https://docs.cloud.google.com/deploy/docs/deploy-app-canary
- Google Cloud Monitoring SLO concepts and error budgets: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring
- Google Cloud Monitoring burn-rate alerting: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate
- Google Cloud Monitoring SLO API usage: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/using-api

## Issues Found
- The Cloud Run traffic-splitting sample sent the remaining traffic to `TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST`. During a progressive rollout, the latest revision is usually the new revision, so this could route both the canary and remainder to the same revision instead of keeping traffic on the previous stable revision. I changed the controller to capture the current serving revision before rollout and route the remainder explicitly to that revision.
- The Cloud Run update call did not specify an update mask or wait for the long-running operation returned by `ServicesClient.update_service`. I added a `FieldMask(paths=["traffic"])` and `operation.result()` so the sample updates only the traffic field and waits for reconciliation to start completing.
- The rollback logic described sending 0% traffic to the new revision, but the implementation now needs to restore the previous stable revision to 100%. I updated the rollback method signature and implementation accordingly.
- The rollout log used `profile`, while the BigQuery reporting example queries `profile_name`. I changed the emitted log key to `profile_name` so the examples are consistent.
- The Cloud Run client was created without a regional endpoint. Cloud Run v2 supports locational endpoints, and the location in the endpoint must match the request path. I updated the sample to use `client_options={"api_endpoint": f"{region}-run.googleapis.com"}`.
- Removed unused imports from the controller snippet while making the technical fixes.

## Review Notes
- The Cloud Monitoring methods for fetching current error rate, remaining budget, and burn rate are intentionally placeholders. A production implementation still needs real Monitoring API time-series selector queries, such as SLO burn-rate selectors.
- Cloud Deploy `verify: true` is valid, but it also requires an appropriate `verify` stanza in `skaffold.yaml`; otherwise the verify job can fail.
- The Python snippets parse successfully. The YAML snippet parses successfully with PyYAML.
