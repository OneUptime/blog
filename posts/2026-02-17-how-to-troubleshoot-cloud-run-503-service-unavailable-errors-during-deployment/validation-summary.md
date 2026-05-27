# Validation Summary: How to Troubleshoot Cloud Run 503 Service Unavailable Errors During Deployment

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- Cloud Logging
- Docker
- Python
- Node.js
- Go
- Artifact Registry
- Cloud Build

## Sources Consulted
- Google Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Google Cloud Run troubleshooting guide: https://cloud.google.com/run/docs/troubleshooting
- Google Cloud Run health checks documentation: https://cloud.google.com/run/docs/configuring/healthchecks
- Google Cloud Run CPU limits and startup CPU boost documentation: https://cloud.google.com/run/docs/configuring/services/cpu
- Google Cloud Run container build documentation: https://cloud.google.com/run/docs/building/containers
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run maximum instances documentation: https://cloud.google.com/run/docs/configuring/max-instances-limits

## Issues Found
- The post stated that the default startup timeout is 300 seconds. Cloud Run services must listen for requests within 4 minutes after being started, so this was corrected.
- The startup CPU boost command used `--startup-cpu-boost`, but the current Google Cloud CLI flag is `--cpu-boost`. The command was updated.
- The startup probe example used unsupported separate flags such as `--startup-probe-path` and `--startup-probe-initial-delay`. Current `gcloud run deploy` uses the consolidated `--startup-probe` flag with comma-separated probe fields, so the example was corrected.
- The prevention section recommended generous startup probe timeouts without noting Cloud Run's startup probe limit. It now mentions the 240-second startup probe limit.

## Review Notes
The remaining commands and examples are technically sound as troubleshooting guidance. The local environment did not have `gcloud` installed, so Google Cloud's official CLI reference and Cloud Run documentation were used for command verification.
