# Validation Summary: How to Use Blue-Green Deployments for Cloud Run Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Cloud Run revisions and traffic splitting
- Google Cloud CLI
- Cloud Build
- Cloud Logging
- Cloud Monitoring
- Bash

## Sources Consulted
- Cloud Run rollbacks, gradual rollouts, and traffic migration: https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Cloud Run revision management: https://docs.cloud.google.com/run/docs/managing/revisions
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud run services update-traffic reference: https://cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- gcloud run revisions list reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/revisions/list
- gcloud run revisions delete reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/revisions/delete
- Cloud Run minimum instances documentation: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Cloud Monitoring Google Cloud metrics reference for Cloud Run metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Cloud Monitoring time-series retrieval documentation: https://docs.cloud.google.com/monitoring/custom-metrics/reading-metrics

## Issues Found
- The post described Cloud Run traffic switching and rollback as "instant." Google Cloud documents that traffic routing adjustments are not instantaneous, although in-flight requests continue to completion. Updated the wording to "fast" or "quickly" and added the routing caveat.
- The tagged URL lookup used `status.traffic[1].url`, which depends on array ordering and can select the wrong traffic target. Replaced it with a `gcloud` lookup that flattens `status.traffic[]` and filters by `status.traffic.tag=green`.
- The traffic switch selected the latest revision by list order. That is fragile if another revision is created or list ordering changes. Updated the examples to route traffic to the known `green` tag with `--to-tags=green=100`, matching Cloud Run's documented tagged-revision workflow.
- The monitoring example used BSD `date -v-30M`, which fails in common Linux environments such as Cloud Shell. Replaced it with GNU/Linux-compatible `date -u -d '30 minutes ago'`.

## Review Notes
- The cleanup step correctly tolerates failed revision deletions with `|| true`; Cloud Run does not allow deleting revisions that can receive traffic, the latest revision, or the only revision.
- The post uses Container Registry-style `gcr.io` image URLs. These still illustrate valid image references, but Artifact Registry is generally preferred for new Google Cloud projects.
