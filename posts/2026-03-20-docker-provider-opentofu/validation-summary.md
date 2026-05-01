# Validation Summary: How to Configure the Docker Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Docker
- Docker provider for OpenTofu/Terraform (`kreuzwerker/docker`)
- HCL

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu provider requirements docs: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI docs for `tofu init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI docs for `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs for `tofu apply`: https://opentofu.org/docs/cli/commands/apply/
- Official Docker provider docs index: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/index.md
- Official Docker provider docs for `docker_image`: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/image.md
- Official Docker provider docs for `docker_container`: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/container.md
- Official Docker provider docs for `docker_network`: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/network.md
- Official Docker provider docs for `docker_volume`: https://github.com/kreuzwerker/terraform-provider-docker/blob/master/docs/resources/volume.md
- Docker daemon connection docs: https://docs.docker.com/reference/cli/docker/

## Issues Found
- The post title, description, and tags were about the Docker provider, but the implementation used the Kubernetes provider (`hashicorp/kubernetes`) and Kubernetes resources. I replaced the provider configuration with the correct `kreuzwerker/docker` provider and updated all resource examples to valid Docker resources.
- The prerequisites incorrectly mentioned access to a Kubernetes cluster. I corrected them to require access to a Docker daemon and permission to reach the Docker socket or remote Docker host.
- The variables were Kubernetes-specific (`kube_context`, `namespace`) and did not define values used by a Docker-based example. I replaced them with Docker-relevant variables such as `docker_host`, `container_name`, `container_image`, `host_port`, `network_name`, and `volume_name`.
- The resource examples used `kubernetes_namespace`, `kubernetes_resource_quota`, `kubernetes_deployment`, and `kubernetes_service`, which were unrelated to the Docker provider. I replaced them with valid `docker_image`, `docker_network`, `docker_volume`, and `docker_container` examples that match the current provider schema.
- The outputs referenced Kubernetes attributes. I replaced them with outputs for the Docker container, network, volume, and published port.
- The best-practice section contained Kubernetes-specific guidance such as namespaces, resource quotas, and liveness/readiness probes. I updated it to Docker-relevant practices such as pinning image tags, using named networks and volumes, and selecting appropriate restart policies.
- The conclusion incorrectly described GitOps management of Kubernetes resources and Helm usage. I corrected it so it accurately describes Docker resources managed with OpenTofu.

## Review Notes
- Runtime validation was not possible in this workspace because neither the `tofu` CLI nor the `docker` CLI is installed here. The review was completed against official OpenTofu and Docker provider documentation instead.
- The example uses `unix:///var/run/docker.sock` by default, which is correct for macOS and Linux. Windows users should switch `docker_host` to `npipe:////./pipe/docker_engine`.
- The example keeps `nginx:latest` as a simple tutorial default, but production configurations should pin an explicit image tag or digest.
- If the post is later expanded to cover automatic image refresh when a moving tag changes, it should use `docker_registry_image` together with `pull_triggers`, as described in the provider documentation.
