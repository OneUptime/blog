# Validation Summary: How to Use Cloud Deploy Custom Targets for Non-GKE Deployment Destinations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Deploy
- Cloud Deploy custom targets and CustomTargetType resources
- Skaffold custom actions
- Google Cloud CLI
- Cloud Storage
- Compute Engine managed instance groups and instance templates
- Docker
- Shell scripting

## Sources Consulted
- Cloud Deploy custom targets overview: https://docs.cloud.google.com/deploy/docs/custom-targets
- Cloud Deploy create a custom target guide: https://docs.cloud.google.com/deploy/docs/create-custom-target
- Cloud Deploy configuration schema reference: https://docs.cloud.google.com/deploy/docs/config-files
- Cloud Deploy deploy parameters documentation: https://docs.cloud.google.com/deploy/docs/parameters
- Cloud Deploy custom target quickstart: https://docs.cloud.google.com/deploy/docs/deploy-app-custom-target
- Google Cloud SDK reference for `gcloud deploy apply`: https://cloud.google.com/sdk/gcloud/reference/deploy/apply
- Google Cloud SDK reference for `gcloud compute instance-templates create-with-container`: https://cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create-with-container
- Google Cloud SDK reference for `gcloud compute instance-groups managed rolling-action start-update`: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/rolling-action/start-update
- Google Cloud SDK reference for `gcloud compute instance-groups managed wait-until`: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/wait-until
- Compute Engine rolling updates for managed instance groups: https://docs.cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups

## Issues Found
- The post said Cloud Deploy natively supports only GKE and Cloud Run. I updated this to include GKE Enterprise clusters, matching the current supported target types.
- The custom render example used undocumented local path variables such as `CLOUD_DEPLOY_OUTPUT_PATH` and did not upload the required `results.json` file. I changed it to use `CLOUD_DEPLOY_OUTPUT_GCS_PATH`, upload the rendered config to Cloud Storage, and write the required render results file.
- The deploy example used `CLOUD_DEPLOY_INPUT_PATH`, but Cloud Deploy provides `CLOUD_DEPLOY_INPUT_GCS_PATH` for custom deploys. I changed the example to download the rendered config from Cloud Storage.
- The deploy example did not write the required deploy `results.json` file to `CLOUD_DEPLOY_OUTPUT_GCS_PATH`. I added that output.
- The examples used deploy parameter names such as `instance-group` and shell variables such as `CLOUD_DEPLOY_zone`, which do not match the documented custom target deploy parameter syntax. I changed them to `customTarget/...` parameters and corresponding `CLOUD_DEPLOY_customTarget_...` environment variables.
- The render script referenced undefined variables, including `CLOUD_DEPLOY_IMAGE` and `CLOUD_DEPLOY_project`, and accidentally used the project value as the instance group. I replaced these with documented custom target deploy parameter variables.
- The VM deploy script hardcoded update settings and region-related values in places where the target parameters were intended to drive behavior. I updated it to use target-provided zone, project, image, and max surge values, with a project fallback to `CLOUD_DEPLOY_PROJECT_ID`.
- The VM deploy script set the managed instance group's template separately before starting a rolling update. I simplified it to use `rolling-action start-update --version=template=...`, which is the documented flow for initiating a MIG rolling update to a new template.
- The use-case list referenced IoT Core, which has been retired. I replaced that example with a generic custom device management workflow.

## Review Notes
The current Cloud Deploy documentation is transitioning terminology from Skaffold `customActions` toward custom tasks in some pages, while the configuration schema still documents `customActions` fields for `CustomTargetType`. The post now follows the documented custom target input/output contract and keeps the existing `customActions` examples aligned with the schema and quickstart examples.
