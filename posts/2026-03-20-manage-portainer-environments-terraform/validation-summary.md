# Validation Summary: How to Manage Portainer Environments with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Terraform
- Hetzner Cloud Terraform provider
- Docker
- Docker Swarm
- Kubernetes

## Sources Consulted
- Portainer Terraform provider `portainer_environment` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- Portainer Terraform provider `portainer_endpoint_group` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/endpoint_group.md
- Portainer Terraform provider `portainer_endpoint_settings` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/endpoint_settings.md
- Portainer Terraform provider source for environment schema: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_environment.go
- Portainer Terraform provider source for endpoint settings schema: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_endpoint_settings.go
- Portainer docs, add a new environment: https://docs.portainer.io/admin/environments/add
- Portainer docs, connect to the Docker socket: https://docs.portainer.io/admin/environments/add/docker/socket
- Portainer docs, add a Kubernetes environment: https://docs.portainer.io/admin/environments/add/kubernetes
- Portainer docs, install Portainer Agent on Kubernetes: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- HashiCorp Terraform `destroy` command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Hetzner Cloud `hcloud_server` resource docs: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/server

## Issues Found
- The post used unsupported `portainer_environment` arguments such as `url`, `tls`, `tls_ca_cert_file`, `tls_cert_file`, and `tls_key_file`. These were corrected to the current provider schema: `environment_address`, `tls_enabled`, `tls_skip_verify`, `tls_ca_cert`, `tls_cert`, and `tls_key`.
- The Swarm example placed security settings directly on `portainer_environment`, but the current provider exposes those controls through `portainer_endpoint_settings`. The post was updated to use a separate `portainer_endpoint_settings` resource and the correct field name `allow_privileged_mode`.
- The Kubernetes examples used unsupported nested blocks (`kubernetes` and `kubernetes_configuration`) and an incorrect type mapping for agent-based Kubernetes environments. They were replaced with provider-supported examples using the flat `portainer_environment` schema and the documented type values (`6` for Kubernetes via agent and `4` for Edge Agent registration).
- The environment group resource name was incorrect. `portainer_environment_group` was changed to the provider’s current `portainer_endpoint_group`, and all references were updated.
- The VM provisioning example used `url` instead of `environment_address`. This was corrected to match the provider schema.
- The `terraform destroy -target=...` example referenced an undefined resource address. It was changed to target a resource that exists in the article’s examples.

## Review Notes
- Portainer supports Kubernetes kubeconfig import in the UI, but the current Terraform provider resource documentation and source do not expose a kubeconfig block for `portainer_environment`. The post now reflects the provider’s actual Terraform schema rather than the broader Portainer UI capabilities.
- The `terraform destroy -target=...` syntax is valid, but HashiCorp documents resource targeting as an exceptional workflow rather than routine usage.
- `terraform` was not installed in this workspace, so CLI verification relied on official HashiCorp documentation instead of local `terraform --help` output.
