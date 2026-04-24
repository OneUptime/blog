# Validation Summary: How to Use Portainer Terraform Provider with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Terraform
- Podman
- Terraform HCL
- GitHub Actions

## Sources Consulted
- Portainer Terraform provider registry metadata: https://registry.terraform.io/v1/providers/portainer/portainer
- Portainer Terraform provider README: https://github.com/portainer/terraform-provider-portainer
- Provider configuration and resource support docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/README.md
- `portainer_environment` docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/environment.md
- `portainer_stack` docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/stack.md
- `portainer_user` docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/user.md
- `portainer_team_membership` docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/team_membership.md
- `portainer_settings` docs: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/settings.md
- Provider source for schema/import behavior: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/provider.go
- Stack importer/source schema: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_stack.go
- Environment schema/source behavior: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_environment.go
- Settings schema/source behavior: https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_settings.go
- Portainer Podman support FAQ: https://docs.portainer.io/faqs/installing/does-portainer-support-podman.md
- Portainer Podman Agent documentation: https://docs.portainer.io/admin/environments/add/podman/agent.md
- Portainer Podman socket documentation: https://docs.portainer.io/admin/environments/add/podman/socket.md
- Podman API service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- `hashicorp/setup-terraform` tags: https://github.com/hashicorp/setup-terraform

## Issues Found
- The provider block used outdated argument names: `skip_tls_verify`, `username`, and `password`. I changed them to `skip_ssl_verify`, `api_user`, and `api_password` to match the current provider schema.
- The environment example used the wrong resource and fields: `portainer_endpoint`, `endpoint_type`, `url`, and `public_url`. I changed the example to `portainer_environment` with `type`, `environment_address`, and `public_ip`, which are the current supported names.
- The original Podman environment example exposed Podman over `tcp://podman-host:2375` and described socket-based use as the primary path. Portainer currently documents Podman socket connections as a legacy local-only option, and Podman warns against exposing the API over TCP without mTLS. I changed the guide to use the Portainer Agent model on port `9001`, which is the better-supported path for this tutorial.
- The post claimed `Podman 4.0+ with socket enabled` as a prerequisite. Portainer’s current docs limit official Podman support to CentOS Stream 9, Podman 5, and rootful mode. I updated the prerequisites accordingly.
- The stack example used the outdated `stack_type` field and referenced the old environment resource. I changed it to the current `portainer_stack` shape using `deployment_type = "standalone"` and `method = "string"`, with `endpoint_id = portainer_environment.podman_host.id`.
- The users/teams section referenced a nonexistent `portainer_endpoint_access` resource. I removed that resource and moved the team environment access example to `team_access_policies` on `portainer_environment`, which is how the current provider models environment access control.
- The settings example described `snapshot_interval` as seconds and set it to `"300"`. The current provider documents this as a duration string. I changed it to `"5m"`.
- The stack import command used the wrong ID format (`endpoint_id:stack_id`). The current provider importer expects `<endpoint_id>-<stack_id>-<deployment_type>[-<method>]`, so I corrected the example to `1-42-standalone-string`.
- The CI example omitted `TF_VAR_dev_user_password`, which would break `terraform plan` when the `portainer_user` resource is present. I added the missing secret to both the plan and apply steps.
- The conclusion overstated Docker/Podman equivalence. I softened the wording to reflect that the same provider resources can be used, but Portainer’s current Podman support matrix and connection-method limits still apply.

## Review Notes
- Portainer’s current Podman support is narrowly documented: CentOS Stream 9, Podman 5, rootful mode.
- Portainer documents direct Podman socket connections as a legacy, local-only option and recommends Agent/Edge Agent approaches for most use cases.
