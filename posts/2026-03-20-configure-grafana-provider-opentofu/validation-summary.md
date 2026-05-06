# Validation Summary: How to Configure Grafana Provider with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Grafana provider
- HCL
- Environment variable based provider authentication

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu plugin and lock file documentation: https://opentofu.org/docs/cli/plugins/
- Grafana provider overview and authentication schema: https://raw.githubusercontent.com/grafana/terraform-provider-grafana/main/docs/index.md
- Grafana `grafana_folder` resource documentation: https://raw.githubusercontent.com/grafana/terraform-provider-grafana/main/docs/resources/folder.md
- Grafana provider registry metadata: https://registry.terraform.io/v1/providers/grafana/grafana
- OpenTofu registry metadata for `grafana/grafana`: https://registry.opentofu.org/v1/providers/grafana/grafana/versions

## Issues Found
- The provider installation example used placeholder names and a fake source address (`provider_name`, `provider-namespace/provider-name`), so it would not install the Grafana provider. I changed it to the real provider source `grafana/grafana` and pinned it to the current major version line with `~> 4.0`.
- The authentication example used non-existent generic environment variables (`PROVIDER_API_KEY` and `PROVIDER_API_SECRET`) and a placeholder provider block. I replaced them with the documented Grafana provider settings `GRAFANA_URL` and `GRAFANA_AUTH`, and updated the provider block to `provider "grafana"`.
- The resource example used a fake resource type (`provider_example_resource`) and unsupported arguments for Grafana. I replaced it with a real minimal resource, `grafana_folder`, which requires a `title`.
- The output referenced the removed placeholder resource. I updated it to reference `grafana_folder.main.id`.
- The first best-practices bullet referred specifically to API keys, which is too narrow for the Grafana provider because the documented `auth` setting also supports service account tokens and basic auth. I changed it to "Grafana credentials" for technical accuracy.

## Review Notes
- As of 2026-05-06, the current published Grafana provider version on the registry is `4.35.0`. The post now pins to `~> 4.0` so the example stays valid across the current major release line without hard-coding a single patch release.
- The Grafana provider documentation is published as Terraform provider documentation, but the configuration syntax used here is compatible with OpenTofu because OpenTofu uses the same `terraform { required_providers { ... } }` syntax and provider installation model.
- Live `tofu` or `terraform` validation was not possible in this workspace because neither CLI is installed. The review was completed against the official documentation and registry metadata above.
