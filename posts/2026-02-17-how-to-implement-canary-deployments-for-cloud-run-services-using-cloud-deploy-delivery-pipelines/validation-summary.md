# Validation Summary: How to Use Canary Deployments for Cloud Run Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Deploy
- Skaffold
- Google Cloud CLI (`gcloud`)
- Cloud Build
- Artifact Registry
- Cloud Monitoring
- Python Google Cloud Monitoring client

## Sources Consulted
- Google Cloud Deploy: Canary deployments to Cloud Run: https://docs.cloud.google.com/deploy/docs/deployment-strategies/canary/cloud-run
- Google Cloud Deploy: Configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Google Cloud Deploy: Manage rollouts: https://docs.cloud.google.com/deploy/docs/deployment-strategies/manage-rollout
- Google Cloud Deploy: Roll back a target: https://docs.cloud.google.com/deploy/docs/roll-back
- Google Cloud SDK reference: `gcloud deploy releases create`: https://cloud.google.com/sdk/gcloud/reference/deploy/releases/create
- Google Cloud SDK reference: `gcloud deploy rollouts describe`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts/describe
- Google Cloud SDK reference: `gcloud deploy rollouts list`: https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/list
- Google Cloud SDK reference: `gcloud deploy rollouts advance`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/rollouts/advance
- Google Cloud SDK reference: `gcloud deploy targets rollback`: https://docs.cloud.google.com/sdk/gcloud/reference/deploy/targets/rollback
- Cloud Run YAML reference: https://docs.cloud.google.com/run/docs/reference/yaml/v1
- Skaffold Cloud Run deployer documentation: https://skaffold.dev/docs/deployers/cloudrun/
- Skaffold verification documentation: https://skaffold.dev/docs/verify/
- Google Cloud Observability request/response SLI metrics: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics

## Issues Found
- The description and rollback flow implied automated rollback behavior. Cloud Deploy supports rollback by creating a rollback rollout, but rollbacks are initiated with `gcloud deploy targets rollback` or equivalent control-plane action. Updated the wording to "rollback capabilities" and "roll back to stable revision."
- The Skaffold verification containers used `curlimages/curl` while the commands call `gcloud run services describe`. That image does not provide the Google Cloud CLI. Updated the examples to use `gcr.io/google.com/cloudsdktool/google-cloud-cli:slim`.
- The post stated that Cloud Deploy automatically advances through canary phases after verification passes. Cloud Deploy documentation says non-standard strategies need rollout advancement from phase to phase unless separate automation is configured. Updated the text to say the rollout is ready to advance and kept the manual advance command.
- The Cloud Monitoring Python example claimed to check the canary revision but filtered only by service. Added a `revision_name` argument and `resource.labels.revision_name` filter so the example targets the canary revision.
- The rollback best-practice note implied Cloud Deploy rolls back automatically on a deliberate staging failure. Updated it to describe testing the `gcloud deploy targets rollback` workflow.

## Review Notes
The Cloud Deploy pipeline shape, Cloud Run target definitions, Cloud Run service YAML fields, `gcloud deploy` command forms, Skaffold `manifests.rawYaml` plus `deploy.cloudrun` usage, and Cloud Monitoring `run.googleapis.com/request_count` metric usage are consistent with current official documentation as of 2026-05-28. The local workspace does not have `gcloud` installed, so CLI syntax was verified against official Google Cloud SDK reference pages rather than local `--help` output.
