# Validation Summary: How to Configure Datadog Provider with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Datadog provider (`DataDog/datadog`)
- HCL
- Datadog monitors

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- Datadog Terraform integration documentation: https://docs.datadoghq.com/integrations/terraform/
- Datadog provider documentation (`docs/index.md`): https://raw.githubusercontent.com/DataDog/terraform-provider-datadog/master/docs/index.md
- Datadog `datadog_monitor` resource documentation: https://raw.githubusercontent.com/DataDog/terraform-provider-datadog/master/docs/resources/monitor.md
- Terraform Registry metadata for the Datadog provider: https://registry.terraform.io/v1/providers/DataDog/datadog
- OpenTofu Registry metadata for the Datadog provider: https://registry.opentofu.org/v1/providers/DataDog/datadog/versions

## Issues Found
- The provider installation example used placeholders (`provider_name`, `provider-namespace/provider-name`) instead of the real Datadog provider. I replaced it with the official source address `DataDog/datadog` and pinned it to the current major version line with `~> 4.0`.
- The authentication section used non-existent generic environment variables (`PROVIDER_API_KEY` and `PROVIDER_API_SECRET`). I replaced them with the documented Datadog provider environment variables `DD_API_KEY` and `DD_APP_KEY`, and added `DD_HOST` as the documented way to target non-US1 Datadog sites.
- The provider block was a placeholder (`provider "provider_name"`). I changed it to `provider "datadog"` and updated the inline guidance to match the Datadog provider's documented configuration.
- The example resource used a fake resource type (`provider_example_resource`) and an unsupported `tags` map. I replaced it with a real `datadog_monitor` resource using documented arguments (`name`, `type`, `message`, `query`, `monitor_thresholds`, `include_tags`, and `tags` as a list of strings).
- The output referenced the removed placeholder resource. I updated it to `datadog_monitor.main.id`.
- The first best-practices bullet referred only to generic API keys. I corrected it to refer specifically to Datadog API and application keys for technical accuracy.

## Review Notes
- As of 2026-05-06, the current published Datadog provider version on the Terraform Registry is `4.6.0`, and the OpenTofu Registry also lists `4.6.0`. Using `~> 4.0` keeps the example valid across the current major release line without hard-coding a single patch release.
- The Datadog provider documentation is published as Terraform provider documentation, but the syntax used here is compatible with OpenTofu. The OpenTofu Registry also publishes the Datadog provider, which confirms current OpenTofu compatibility for this provider line.
- The provider documentation states the Datadog provider requires Terraform `1.1.5` or later. This does not conflict with the post's `required_version = ">= 1.6.0"` because the post targets OpenTofu, and OpenTofu uses the same provider configuration model.
- Live `tofu` or `terraform` validation was not possible in this workspace because neither CLI is installed. The review was completed against the official documentation and registry metadata above.
