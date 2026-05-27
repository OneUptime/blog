# Validation Summary: How to Switch Between Multiple GCP Projects Using gcloud Config Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CLI (`gcloud`)
- Google Cloud CLI named configurations
- Google Cloud CLI properties
- Bash and Zsh shell configuration
- App Engine and Compute Engine command examples

## Sources Consulted
- Google Cloud CLI guide: Managing gcloud CLI configurations: https://docs.cloud.google.com/sdk/docs/configurations
- Google Cloud CLI reference: `gcloud topic configurations`: https://docs.cloud.google.com/sdk/gcloud/reference/topic/configurations
- Google Cloud CLI reference: `gcloud config configurations`: https://docs.cloud.google.com/sdk/gcloud/reference/config/configurations
- Google Cloud CLI reference: `gcloud config configurations create`: https://docs.cloud.google.com/sdk/gcloud/reference/config/configurations/create
- Google Cloud CLI reference: `gcloud config configurations activate`: https://docs.cloud.google.com/sdk/gcloud/reference/config/configurations/activate
- Google Cloud CLI reference: `gcloud config configurations delete`: https://docs.cloud.google.com/sdk/gcloud/reference/config/configurations/delete
- Google Cloud CLI reference: `gcloud config configurations rename`: https://docs.cloud.google.com/sdk/gcloud/reference/config/configurations/rename
- Google Cloud CLI reference: `gcloud config list`: https://cloud.google.com/sdk/gcloud/reference/config/list
- Google Cloud CLI reference: `gcloud config get`: https://cloud.google.com/sdk/gcloud/reference/config/get
- Google Cloud CLI reference: `gcloud auth login`: https://cloud.google.com/sdk/gcloud/reference/auth/login
- Google Cloud CLI reference: `gcloud app deploy`: https://cloud.google.com/sdk/gcloud/reference/app/deploy

## Issues Found
- The post used `CLOUDSDK_ACTIVE_NAMED_CONFIG` for per-terminal configuration selection. Google Cloud documents `CLOUDSDK_ACTIVE_CONFIG_NAME`, so the examples and best-practices bullet were updated.
- The post said `gcloud` does not support renaming configurations directly. Current Google Cloud CLI documentation includes `gcloud config configurations rename`, so the workaround was replaced with `gcloud config configurations rename old-name --new-name=new-name`.
- The post used `gcloud config get-value` for reading property values. The current reference documents `gcloud config get`, so those examples were updated.
- The post stated that configurations are stored in `~/.config/gcloud/configurations/` without qualification. Google documents this as the typical macOS/Linux config directory and notes other locations/config overrides, so the wording was changed to "On macOS and Linux, configurations are typically stored under...".

## Review Notes
The `gcloud` binary was not installed in the local review environment, so command validation was performed against current official Google Cloud CLI documentation rather than local `--help` output.
