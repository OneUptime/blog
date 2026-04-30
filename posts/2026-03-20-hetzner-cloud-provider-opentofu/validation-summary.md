# Validation Summary: How to Configure the Hetzner Cloud Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Hetzner Cloud
- Hetzner Cloud `hcloud` provider
- HCL infrastructure as code

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu `tofu init`: https://opentofu.org/docs/cli/init/
- OpenTofu `tofu validate`: https://opentofu.org/docs/v1.9/cli/commands/validate/
- OpenTofu `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Hetzner provider overview: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/index.md
- Hetzner server resource docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/server.md
- Hetzner network resource docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/network.md
- Hetzner network subnet docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/network_subnet.md
- Hetzner server network attachment docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/server_network.md
- Hetzner load balancer docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer.md
- Hetzner load balancer network attachment docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer_network.md
- Hetzner load balancer target docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer_target.md
- Hetzner load balancer service docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/load_balancer_service.md
- Hetzner provider auth schema: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/hcloud/plugin_provider.go
- Hetzner load balancer service schema: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/internal/loadbalancer/resource_service.go
- Hetzner locations reference: https://docs.hetzner.com/cloud/general/locations/
- Hetzner load balancer overview: https://docs.hetzner.com/cloud/load-balancers/overview/
- Hetzner load balancer FAQ: https://docs.hetzner.com/cloud/load-balancers/faq/

## Issues Found
- The post used a placeholder `hashicorp/example` provider instead of the real `hetznercloud/hcloud` provider. I replaced it with the current Hetzner provider source and version pin.
- The authentication example used nonexistent environment variables and generic credentials. I corrected this to `HCLOUD_TOKEN` and a `provider "hcloud"` block that reads from the provider environment variable.
- The resource examples referenced nonexistent Hetzner resources such as `example_project`, `example_team`, `example_alert`, and `example_backup_policy`. I replaced them with actual Hetzner Cloud resources for networks, subnet attachment, servers, load balancers, targets, and services.
- The server example used `tags`, but the provider supports `labels` for user-defined metadata. I corrected that field.
- The load balancer service example needed `retries` in the `health_check` block to match the current provider schema. I added it.
- The original rate-limiting guidance recommended `depends_on` as a generic workaround. I replaced that with the provider-supported `poll_interval` guidance and used `depends_on` only where the private load balancer target actually needs attachment ordering.
- The prerequisites and conclusion overstated compatibility and scope. I updated them to refer to a supported OpenTofu release and to the Hetzner resources the article actually demonstrates.

## Review Notes
- `tofu` and `terraform` are not installed in this workspace, so I could not run `tofu init` or `tofu validate` locally. The review was completed against official OpenTofu docs, official Hetzner provider docs, and the provider's current source schema.
- The article now pins the provider to the current `1.60.x` line as of April 30, 2026. Future updates should re-check the latest `hetznercloud/hcloud` release before changing that constraint.
- The example uses `nbg1` and `eu-central`, which are valid and consistent according to Hetzner's locations documentation.
