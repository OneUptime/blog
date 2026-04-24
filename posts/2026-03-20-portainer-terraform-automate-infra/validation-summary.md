# Validation Summary: How to Automate Portainer Infrastructure with Terraform - Infra

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- AWS EC2
- Portainer
- Docker
- cloud-init / EC2 user data
- Terraform HCL

## Sources Consulted
- Terraform provider configuration reference: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform provider requirements reference: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform `depends_on` reference: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Portainer Terraform provider repository and provider configuration docs: https://github.com/portainer/terraform-provider-portainer
- Portainer Terraform provider `portainer_environment` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- Portainer Terraform provider `portainer_stack` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/stack.md
- Portainer API access docs: https://docs.portainer.io/2.21/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer docs for adding environments via API: https://docs.portainer.io/admin/environments/add/api
- Portainer CE initial setup docs: https://docs.portainer.io/start/install-ce/server/setup
- Portainer CE Docker install docs: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer source for `/api/users/admin/init`: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/admin_init.go
- Portainer source for `/api/system/status`: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/status.go

## Issues Found
- The post claimed the full workflow could run in a single `terraform apply`, but Terraform provider configuration values must be known before apply and cannot depend on computed resource attributes such as `aws_instance.portainer_server.public_ip`. I corrected the workflow to use separate infrastructure and Portainer stages.
- The Portainer provider block used unsupported/incorrect patterns: `depends_on` is not valid in provider blocks, `skip_tls_verify` is not the current Portainer provider argument, and the provider configuration depended on a resource attribute. I changed this to a separate-stage provider config using `var.portainer_endpoint`, `api_user`, `api_password`, and `skip_ssl_verify`.
- The post omitted `required_providers` for the third-party Portainer provider. I added `required_providers` blocks so `portainer/portainer` is sourced correctly.
- The Portainer resource examples used outdated or incorrect schema fields: `environment_url` and `environment_type` were replaced with `environment_address` and `type`, and the stack examples now include the required `deployment_type` and `method` arguments.
- The stack environment variable example used list syntax that does not match the documented resource examples. I changed this to `env { ... }` blocks and updated file paths to use `${path.module}`.
- The bootstrap script attempted to initialize Portainer over `http://localhost:9000`, but the container only exposed `9443` in the example. I corrected the script to wait for `https://localhost:9443/api/system/status` and then call `https://localhost:9443/api/users/admin/init`.
- The admin-init JSON example did not match the documented Portainer API field names. I updated it to use `Username` and `Password`.
- The example apply commands were incomplete for the shown configuration and no longer matched a technically correct workflow. I updated them to a two-stage example with the required Portainer endpoint and application variables.

## Review Notes
- The Docker install method in the post uses Docker's convenience script. This is functional, but Docker's official documentation generally prefers repository-based installation steps for controlled production environments.
- I could not run `terraform validate` locally because the `terraform` CLI is not installed in this workspace. The review was completed by checking the examples against official Terraform and Portainer documentation and the upstream Portainer source.
