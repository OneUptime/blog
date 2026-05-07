# Validation Summary: How to Automate Portainer Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Terraform
- Portainer Terraform provider
- Hetzner Cloud Terraform provider
- HashiCorp time provider
- Docker
- cloud-init
- Amazon S3 remote state backend

## Sources Consulted
- Portainer Terraform provider README: https://github.com/portainer/terraform-provider-portainer
- Portainer Terraform provider `portainer_environment` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- Portainer Terraform provider `portainer_stack` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/stack.md
- Portainer Terraform provider `portainer_endpoint_group` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/endpoint_group.md
- Portainer Terraform provider `portainer_tag` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/tag.md
- Portainer Agent on Docker Standalone docs: https://docs.portainer.io/admin/environments/add/docker/agent
- Hetzner Cloud `hcloud_server` resource docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/server.md
- Hetzner Cloud `hcloud_firewall` resource docs: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/firewall.md
- Terraform S3 backend docs: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp `time_sleep` resource docs: https://github.com/hashicorp/terraform-provider-time/blob/main/docs/resources/sleep.md
- HashiCorp time provider registry page: https://registry.terraform.io/providers/hashicorp/time/latest

## Issues Found
- The Portainer provider block used `access_token`, but the official provider uses `api_key`. I changed the snippet to `api_key = var.portainer_api_key` to match the documented schema.
- The post used `portainer_environment_group` and `url` in the environment resource. The official provider uses `portainer_endpoint_group` and `environment_address`, so I corrected those names.
- The environment example referenced a production endpoint group and tag without defining them. I added `portainer_endpoint_group.production` and `portainer_tag.production` so the example is internally consistent.
- The environment registration step only depended on VM creation, which does not guarantee cloud-init has finished installing Docker and starting the Portainer Agent. I added `hashicorp/time` and a `time_sleep` resource with `triggers` based on the host IDs so initial applies and later scale-outs both wait before Portainer registration.
- The stack resources omitted the required `deployment_type` and `method` arguments from the official `portainer_stack` schema. I added those fields.
- The monitoring stack used `stack_file_content = file(...)` and `env = [...]`. I changed it to `method = "file"` with `stack_file_path`, and converted the environment variable to the documented `env { ... }` block syntax.
- The bootstrap script installed the legacy `docker-compose` package even though this workflow only needs Docker Engine to run the Portainer Agent. I removed that package to avoid relying on deprecated Compose v1 packaging.
- The architecture diagram ended with "Configure users and teams", but the post does not implement that step. I updated the diagram so it matches the actual code shown in the article.

## Review Notes
- Portainer documents the standard Docker Standalone Agent as a legacy option and recommends the Edge Agent for many use cases. The corrected post remains technically valid for directly reachable Docker hosts where Portainer can connect to port `9001`.
- The `hcloud` provider pin `~> 1.44` is older than the current provider release line, but the arguments used in this post still match the current official documentation.
- The local workspace did not have the `terraform` CLI installed, so I validated the post against official provider documentation and examples rather than running `terraform validate`.
