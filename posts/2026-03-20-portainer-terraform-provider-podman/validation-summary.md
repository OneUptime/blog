# Validation Summary: How to Use Portainer Terraform Provider with Podman - Provider

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Portainer Terraform Provider
- Terraform / HCL
- Podman
- Terraform S3 backend

## Sources Consulted
- Portainer Terraform Provider README: https://github.com/portainer/terraform-provider-portainer
- Portainer Terraform Provider `portainer_environment` data source docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/data-sources/environment.md
- Portainer Terraform Provider `portainer_stack` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/stack.md
- Portainer Terraform Provider `portainer_registry` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/registry.md
- Portainer CE install with Podman on Linux: https://docs.portainer.io/start/install-ce/server/podman/linux
- Portainer Podman support FAQ: https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer account settings / access tokens: https://docs.portainer.io/user/account-settings
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html

## Issues Found
1. **Provider endpoint example matched legacy HTTP rather than current default Portainer setup**: Changed `endpoint = "http://localhost:9000"` to `endpoint = "https://localhost:9443"` and added `skip_ssl_verify = true`. Current Portainer installs expose HTTPS on `9443` by default, and Portainer generates a self-signed certificate by default.

2. **Wrong Terraform data source name for Portainer environments**: Replaced `data "portainer_endpoint"` with `data "portainer_environment"`, which is the actual supported data source name in the current Portainer Terraform provider.

3. **Environment lookup text did not match the example code**: Changed the prose from “note its ID” to “note its name” because the example uses a name-based data source lookup.

4. **Outdated `portainer_stack` argument schema**: Replaced `type = 2` with `deployment_type = "standalone"`. The current provider documentation uses `deployment_type` with values such as `standalone`, `swarm`, and `kubernetes`.

5. **Incorrect registry type constant for a custom registry**: Changed the registry `type` from `1` to `3`. In the current provider docs, `1` is Quay.io and `3` is Custom.

6. **Custom registry authentication fields were incomplete**: Added `authentication = true` to the custom registry example because the snippet supplies `username` and `password`.

7. **Referenced Terraform variables were undeclared**: Added `variable` declarations for `portainer_api_key`, `registry_username`, and `registry_password`, and added matching `TF_VAR_*` export examples so the configuration is runnable as written.

## Review Notes
- Portainer’s current Podman documentation lists support constraints around CentOS Stream 9, Podman 5, and rootful Podman. Other Podman versions or distributions may work, but Portainer does not currently document them as officially supported.
- The provider’s official README also notes that Podman exposes a Docker-compatible API, so many `portainer_docker_*` resources can be used against Podman environments as well. This post focuses on environment, stack, and registry examples only.
- `version = "~> 1.0"` is still a valid Terraform version constraint for the provider’s current 1.x releases, although it is a broad constraint rather than a tight pin.
