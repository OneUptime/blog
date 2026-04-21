# Validation Summary: How to Speed Up tofu plan in Large Configurations

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan workflow
- OpenTofu provider plugin cache
- OpenTofu data sources
- OpenTofu remote state
- AWS provider availability zone data sources
- S3 backend configuration

## Sources Consulted
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu CLI configuration and plugin cache documentation: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu data sources documentation: https://opentofu.org/docs/language/data-sources/
- OpenTofu `terraform_remote_state` data source documentation: https://opentofu.org/docs/language/state/remote-state-data/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu `slice` function documentation: https://opentofu.org/docs/language/functions/slice/
- HashiCorp AWS provider `aws_availability_zone` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zone
- HashiCorp AWS provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones

## Issues Found
1. **Debug logging overstated timing precision**: The post said debug logging would show which resources take longest. OpenTofu documents debug logging for troubleshooting, but not as a stable per-resource timing report. Changed the comment and grep example to describe inspecting refresh activity instead.

2. **`-target` description was too absolute**: The post said targeting would only plan the resources being changed. OpenTofu's `-target` focuses planning on selected whole resources or module addresses and their dependencies, and official docs recommend it only for exceptional cases. Updated the wording to say it focuses planning and should be used sparingly.

3. **Provider cache wording implied every `init` downloads providers**: OpenTofu reuses providers already installed in a working directory, and the plugin cache mainly helps fresh working directories, multiple configurations, and CI runs. Updated the wording to reflect that scope.

4. **Data source wording was overbroad**: The post said each data source makes a cloud API call, but OpenTofu documents local-only data sources and data sources can also read non-cloud systems. Changed this to "Many provider data sources make API calls."

## Review Notes
- `tofu plan -refresh=false`, `-parallelism`, and `-target` are valid OpenTofu plan options. The default parallelism value of 10 is correct.
- `TF_LOG`, `TF_LOG_PATH`, and `TF_PLUGIN_CACHE_DIR` are valid OpenTofu environment variables.
- The AWS availability zone examples use valid AWS provider data source names and the `state` and `names` fields are correct.
- The `terraform_remote_state` example is valid for OpenTofu and the S3 backend config fields `bucket`, `key`, and `region` are correct.
- `terraform_remote_state` exposes only root module outputs and may expose sensitive state data to readers; this is worth calling out if the post is expanded later.
