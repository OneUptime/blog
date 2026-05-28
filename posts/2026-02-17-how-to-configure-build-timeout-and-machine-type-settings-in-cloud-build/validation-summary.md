# Validation Summary: How to Configure Build Timeout and Machine Type Settings in Cloud Build

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Build
- Cloud Build build configuration YAML
- Google Cloud CLI
- Cloud Build triggers
- Docker build and push steps

## Sources Consulted
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Cloud Build REST API Build resource and BuildOptions schema: https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.builds
- Google Cloud CLI `gcloud builds submit` reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Google Cloud CLI `gcloud builds triggers create github` reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build trigger management docs: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Google Cloud Build pricing: https://cloud.google.com/build/pricing

## Issues Found
- The post said Cloud Build's default timeout is 10 minutes. Google Cloud's current build config schema says the default build timeout is 60 minutes, so the default settings section was updated to 3600 seconds.
- The post described the default machine as `e2-medium` with 1 vCPU and 4 GB RAM. Current Cloud Build pricing identifies the quick-start default pool machine as `e2-standard-2` with 2 vCPUs and 8 GB RAM, so the default settings and machine-type table were corrected.
- The disk size maximum was listed as 2000 GB. The Cloud Build API documentation states the current maximum is 4000 GB, so the disk-size section was updated and the YAML examples were adjusted to quote `diskSizeGb` values as documented string/int64 values.
- The cost section said `E2_MEDIUM` is included in a 120 build-minutes-per-day free tier and that larger machines cost about 8x and 32x the default. The pricing page now says each billing account gets 2,500 free build-minutes per month for `e2-standard-2` in the default pool, so the cost discussion was corrected without adding exact price tables.
- The trigger section claimed machine type and timeout can be overridden per trigger, but the shown `gcloud builds triggers create github` command has no machine-type or timeout flags. The section was changed to explain using different build config files per trigger for different settings.

## Review Notes
The remaining YAML fields and enum values checked out against the official schema: top-level `timeout`, build-step `timeout`, `options.machineType`, `options.logging`, `options.diskSizeGb`, and `images` are valid. The `N1_HIGHCPU_8` and `N1_HIGHCPU_32` machine types remain supported but deprecated, which the post already communicates.
