# Validation Summary: How to Deploy Harbor Container Registry with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform HCL
- Harbor
- Harbor Helm chart
- Kubernetes
- Helm
- Trivy
- Harbor REST API
- Docker Hub replication

## Sources Consulted
- Harbor Helm chart repository: https://github.com/goharbor/harbor-helm
- Harbor Helm chart values reference: https://raw.githubusercontent.com/goharbor/harbor-helm/main/README.md
- Harbor Helm repository index: https://helm.goharbor.io/index.yaml
- Harbor API v2.0 Swagger: https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml
- Harbor docs, Creating a Replication Rule: https://goharbor.io/docs/2.14.0/administration/configuring-replication/create-replication-rules/
- Harbor docs, Project Configuration: https://goharbor.io/docs/main/working-with-projects/project-configuration/
- Harbor docs, Sign Artifacts with Cosign or Notation: https://goharbor.io/docs/main/working-with-projects/working-with-images/sign-images/
- Harbor docs, Deploying Harbor with High Availability via Helm: https://goharbor.io/docs/edge/install-config/harbor-ha-helm/
- Terraform Registry, `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry, `kubernetes_namespace`: https://registry.terraform.io/providers/hashicorp/kubernetes/2.23.0/docs/resources/namespace

## Issues Found
- The post configured `kubernetes_namespace` without configuring the Kubernetes provider. I added a matching `provider "kubernetes"` block so the namespace resource uses the same explicit cluster connection as the Helm provider.
- The Harbor chart pin was outdated. I updated the example from chart `1.14.2` to the current `1.18.3` release in the official Harbor Helm index.
- The ingress example used Notary-specific host and TLS fields that are not part of the current Harbor chart values. I removed those fields and switched the ingress class setting to the supported `expose.ingress.className`.
- The persistence example used the wrong schema for jobservice storage. I changed `persistence.persistentVolumeClaim.jobservice` to `persistence.persistentVolumeClaim.jobservice.jobLog`, which is the chart’s documented structure.
- The example set `trivy.autoScan`, but automatic scan-on-push is not a Harbor Helm chart value. I removed that field and updated the best-practice text to point to Harbor’s project configuration, where scan-on-push is actually configured.
- The replication example only created a registry endpoint, not a replication rule. I replaced it with a Harbor API example that creates the Docker Hub registry endpoint and then creates a pull-based replication policy using the documented `Registry` and `ReplicationPolicy` objects.
- The replication payload used the older deletion flag semantics in the original pattern. I used `replicate_deletion` instead of the deprecated `deletion` field.
- The final best-practice bullet recommended Notary, but current Harbor documentation for content trust points to Cosign and Notation. I updated the post accordingly.

## Review Notes
- Harbor chart `1.18.3` was the latest Harbor chart in the official Helm index on 2026-04-30 and maps to Harbor appVersion `2.14.3`.
- The replication example is technically correct, but it still uses `null_resource` with `local-exec`, so it is less declarative than a dedicated provider-based workflow. It also assumes the Harbor project referenced by `var.replication_project` already exists.
