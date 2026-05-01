# Validation Summary: How to Convert Docker Compose to Kubernetes Manifests with Portainer Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Terraform
- Kubernetes
- Docker Compose
- Kompose
- YAML

## Sources Consulted
- Kompose installation guide: https://kompose.io/installation/
- Kompose user guide: https://kompose.io/user-guide/
- Kompose latest release: https://github.com/kubernetes/kompose/releases/tag/v1.38.0
- Docker Compose file reference, `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Portainer Terraform provider `portainer_stack` resource documentation: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/stack.md
- Portainer Terraform provider `portainer_compose_convert` resource documentation: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/compose_convert.md
- Portainer Terraform provider latest release: https://github.com/portainer/terraform-provider-portainer/releases/tag/v1.28.0
- Local validation with Kompose v1.38.0: `kompose convert --help` and a live conversion run against the post's sample Compose file

## Issues Found
- The Kompose install snippet pinned an older release and downloaded the binary locally without placing it on `PATH`, but the next command invoked `kompose` directly. Updated the example to the current `v1.38.0` release and added `sudo mv ./kompose /usr/local/bin/kompose`, matching the official installation guide.
- The Compose sample used the obsolete top-level `version` field. Removed it to match the current Compose specification and avoid the warning current Compose tooling emits for `version`.
- The sample Compose input did not expose PostgreSQL internally, so current Kompose output would not create `postgres-service.yaml`. Added `expose: "5432"` to the `postgres` service so the generated manifests include a Kubernetes Service named `postgres`, which the `DB_HOST=postgres` example depends on.
- The generated file list and Terraform file references used the wrong PVC filename. Current Kompose names the claim file after the Compose volume (`db-data-persistentvolumeclaim.yaml`), not after the service name, so both snippets were corrected.
- The generated Deployment YAML example was not valid as shown because it omitted `spec.template.metadata.labels` while also using a selector. Added the matching labels and aligned the example with current Kubernetes `apps/v1` Deployment requirements.
- The Portainer Terraform example used `portainer_kubernetes_manifest`, which is not the current resource for deploying Kubernetes stacks with the Portainer provider. Replaced it with the documented `portainer_stack` resource using `deployment_type = "kubernetes"` and `method = "string"`, and added the required `name` and `stack_file_content` arguments.
- The manifest join separator was updated from `---\n` to `\n---\n` so multi-document YAML is separated safely regardless of whether the preceding file ends with a trailing newline.

## Review Notes
- The post's overall approach remains valid, but current Portainer Terraform also provides `portainer_compose_convert` for running Kompose-backed conversion inside Terraform if the team wants a more integrated workflow.
- Kompose output is still a starting point rather than a final production manifest set. The post correctly recommends reviewing probes, resources, and secret handling after conversion.
