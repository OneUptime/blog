# Validation Summary: How to Use the Official Portainer Terraform Provider

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Terraform
- Terraform HCL
- Portainer HTTP API
- Container registry configuration

## Sources Consulted
- Portainer Terraform provider repository (official): https://github.com/portainer/terraform-provider-portainer
- Portainer Terraform provider README (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/README.md
- Portainer Terraform provider resource docs for `environment`, `stack`, `registry`, `team_membership`, and `user` (official): https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/environment.md
- Portainer Terraform provider examples for `environment`, `stack`, and `registry` (official): https://github.com/portainer/terraform-provider-portainer/tree/main/examples
- Portainer API access documentation (official): https://docs.portainer.io/api/access
- Portainer API documentation index (official): https://docs.portainer.io/api/docs
- Portainer stack removal documentation (official): https://docs.portainer.io/user/docker/stacks/remove
- Portainer server stack delete handler showing stack undeploy behavior (official source): https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_delete.go
- Terraform CLI commands reference (official): https://developer.hashicorp.com/terraform/cli/commands
- Latest Portainer Terraform provider release metadata (official): https://github.com/portainer/terraform-provider-portainer/releases/latest

## Issues Found
- The provider configuration used `skip_tls_verify`, but the official provider argument is `skip_ssl_verify`. I corrected the argument name and updated `endpoint` to use the already-declared `var.portainer_endpoint` variable so the example is internally consistent.
- The `terraform.tfvars` example used a `ptr_` token prefix that is not documented by Portainer. I replaced it with a generic `YOUR_PORTAINER_API_KEY` placeholder to avoid implying a token format the official docs do not specify.
- The user example referenced `var.initial_user_password` without defining it. I added the missing variable declaration so the snippet is usable as written.
- The environment examples used incorrect resource arguments: `environment_url`, `environment_type`, and `tls`. The official `portainer_environment` resource uses `environment_address`, `type`, and `tls_enabled`, so I updated those fields accordingly.
- The stack examples omitted required arguments `deployment_type` and `method`, and used `env = [...]` instead of the provider’s nested `env` blocks. I corrected the stack syntax so the examples match the official resource schema.
- The registry examples used `registry_type`, which is not a valid argument for `portainer_registry`; the provider uses `type`. The custom Harbor example also used the wrong numeric type value, so I changed it to `type = 3` for a custom registry.
- The full GHCR example used the wrong registry type value and referenced undefined `github_username` / `github_token` variables. I converted it to the documented custom-registry configuration for `ghcr.io` and reused the previously defined generic registry credentials, which keeps the example valid for CE/BE readers.
- The `terraform destroy` note incorrectly said destruction removes resources only from Portainer and not from Docker. Portainer’s own stack-delete implementation undeploys the stack from the target environment, so I replaced that note with neutral, accurate wording.

## Review Notes
- The post is now technically consistent with the official Portainer Terraform provider resource schema.
- The provider version constraint `~> 1.0` is still valid for the current 1.x release line. As of April 12, 2026, the latest official release is `v1.28.0`.
- Portainer’s official provider documentation is currently most complete in the GitHub repository docs and examples; the Terraform Registry page for this provider remains comparatively sparse.
- Portainer supports a dedicated GitHub registry type (`type = 8`) in its official examples, but the provider docs also show a custom-registry configuration for `ghcr.io`. Using the custom type keeps the tutorial example broadly compatible with both Portainer CE and BE.
