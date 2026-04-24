# Validation Summary: How to Convert Docker Compose to Kubernetes Manifests with Portainer Terra (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Terraform provider
- Terraform
- Docker Compose
- Kompose
- Kubernetes manifests
- Helm
- kubectl

## Sources Consulted
- Portainer Terraform provider README: https://github.com/portainer/terraform-provider-portainer
- Portainer `portainer_compose_convert` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/compose_convert.md
- Portainer `portainer_stack` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/stack.md
- Portainer `portainer_kubernetes_namespace` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/kubernetes_namespace.md
- Portainer `portainer_kubernetes_service` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/kubernetes_service.md
- Portainer `portainer_kubernetes_helm` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/kubernetes_helm.md
- Portainer Kubernetes application example: https://github.com/portainer/terraform-provider-portainer/tree/main/examples/kubernetes_application
- Kompose installation guide: https://github.com/kubernetes/kompose/blob/main/docs/installation.md
- Kompose user guide: https://github.com/kubernetes/kompose/blob/main/docs/user-guide.md
- Docker Compose file reference for the obsolete top-level `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Local verification with `kompose v1.38.0` via `kompose convert --help` and a sample conversion run using the post's Compose pattern

## Issues Found
- The title said `Portainer Terra` even though the post is about the Portainer Terraform provider. I corrected the title to `Portainer Terraform`.
- The Kompose install command wrote directly to `/usr/local/bin/kompose` without elevated privileges. I changed it to download locally, mark the binary executable, and move it with `sudo`, which matches the supported installation flow.
- The Compose example used the obsolete top-level `version` field. I removed it to align with current Compose documentation.
- The original Compose example did not expose PostgreSQL or Redis ports, so Kompose would not generate `db-service.yaml` or `redis-service.yaml` for those services. I added `expose` entries for `db` and `redis` so the generated output matches the walkthrough and the service DNS names used by the app remain valid after conversion.
- The generated file list was inaccurate. Kompose names PVC manifests from the volume names, so I corrected the examples to `postgres-data-persistentvolumeclaim.yaml` and `redis-data-persistentvolumeclaim.yaml`.
- The enhanced Kubernetes Deployment omitted the `REDIS_URL` environment variable that existed in the original Compose configuration. I added it back so the example remains functionally consistent.
- The post used a non-existent `portainer_kubernetes_manifest` resource. I replaced it with supported Portainer resources: `portainer_kubernetes_namespace`, `portainer_kubernetes_application`, and `portainer_kubernetes_service`.
- The Helm example used a non-existent `portainer_helm_release` resource and unsupported argument names. I replaced it with the supported `portainer_kubernetes_helm` resource and corrected the arguments to `environment_id`, `name`, and `repo`.
- The migration example used `portainer_stack` without required arguments and again relied on the non-existent `portainer_kubernetes_manifest` resource. I added the required `deployment_type` and `method` fields for the Docker stack and switched the Kubernetes side to a supported `portainer_stack` configuration with inline manifest content.
- The cutover step said to point DNS at the Kubernetes service, but the generated Kompose `Service` is not automatically an external ingress point. I corrected the wording to point DNS at the Kubernetes ingress or load balancer.

## Review Notes
- Portainer's provider documentation currently contains some naming inconsistencies across Kubernetes resources, so I followed the official resource docs and checked the upstream examples where needed.
- `portainer_kubernetes_helm` documentation does not document chart version pinning in the resource arguments, so the Helm example was adjusted to use only supported fields.
- `terraform` was not installed in the local environment, so I could not run `terraform validate`; the Terraform review was done against Portainer's official provider docs and examples.
