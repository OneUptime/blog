# Validation Summary: How to Manage Rollouts and Phases in Cloud Deploy Canary Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Deploy
- Google Cloud SDK / gcloud CLI
- Cloud Deploy canary deployment strategies
- Cloud Deploy rollout phases, jobs, and job runs
- Cloud Deploy automation rules
- Kubernetes / GKE
- Kubernetes Gateway API
- Cloud Monitoring

## Sources Consulted
- Google Cloud Deploy: Manage rollouts - https://cloud.google.com/deploy/docs/deployment-strategies/manage-rollout
- Google Cloud Deploy: Use a canary deployment strategy - https://cloud.google.com/deploy/docs/deployment-strategies/canary
- Google Cloud Deploy: GKE service-based canary deployments - https://cloud.google.com/deploy/docs/deployment-strategies/canary/gke/service-networking
- Google Cloud Deploy: GKE Gateway API canary deployments - https://cloud.google.com/deploy/docs/deployment-strategies/canary/gke/gateway-api
- Google Cloud Deploy: Automation rules - https://cloud.google.com/deploy/docs/automation-rules
- Google Cloud SDK reference: gcloud deploy rollouts advance - https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/advance
- Google Cloud SDK reference: gcloud deploy rollouts retry-job - https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts/retry-job
- Google Cloud SDK reference: gcloud deploy rollouts and job-runs command groups - https://cloud.google.com/sdk/gcloud/reference/deploy/rollouts and https://cloud.google.com/sdk/gcloud/reference/deploy/job-runs

## Issues Found
- The post did not mention that Cloud Deploy can skip canary phases on the first deployment to a target when there is no existing version to split traffic with. Added a short caveat in the phase overview.
- The service networking explanation implied an exact traffic ratio. Updated it to say the ratio is based on pod counts, matching Cloud Deploy's GKE service networking behavior.
- The retry example used the nonexistent `gcloud deploy job-runs retry` command. Replaced it with `gcloud deploy rollouts retry-job` and the required `--job-id` and `--phase-id` flags.
- The ignore example used `gcloud deploy rollouts advance --override`, which is not the Cloud Deploy command for ignoring a failed job. Replaced it with `gcloud deploy rollouts ignore-job` and the required job and phase flags.
- The automation rule used `name` under `advanceRolloutRule`; official examples use `id`. Updated the field to `id`.
- The automation wait used `300s`; official Cloud Deploy automation rule documentation specifies minute-based waits such as `5m`. Updated the wait value to `5m`.
- The automation explanation said the final stable phase was left out, but `sourcePhases` identifies phases to advance from. Updated the explanation to clarify that leaving out `canary-75` makes the 75% to `stable` advance manual or separately automated.

## Review Notes
The Google Cloud SDK was not installed in the local environment, so CLI validation was performed against the official Google Cloud SDK reference and Cloud Deploy documentation rather than local `gcloud --help` output.
