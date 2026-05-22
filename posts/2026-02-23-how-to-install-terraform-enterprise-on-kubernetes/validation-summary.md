# Validation Summary: How to Install Terraform Enterprise on Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Terraform Enterprise
- Kubernetes
- Helm
- HashiCorp Terraform Enterprise Helm chart
- PostgreSQL
- S3-compatible object storage
- NGINX Ingress
- Prometheus metrics

## Sources Consulted
- HashiCorp Terraform Enterprise Kubernetes deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/kubernetes
- HashiCorp Terraform Enterprise configuration reference: https://developer.hashicorp.com/terraform/enterprise/deploy/reference/configuration
- HashiCorp Terraform Enterprise releases page: https://developer.hashicorp.com/terraform/enterprise/releases
- HashiCorp Terraform Enterprise diagnostics documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Terraform Enterprise Helm chart values: https://github.com/hashicorp/terraform-enterprise-helm/blob/main/values.yaml
- HashiCorp Terraform Enterprise Helm chart templates: https://github.com/hashicorp/terraform-enterprise-helm/tree/main/templates
- HashiCorp Terraform Enterprise Helm chart README: https://github.com/hashicorp/terraform-enterprise-helm/blob/main/README.md
- HashiCorp Terraform Enterprise Helm chart Kubernetes configuration notes: https://github.com/hashicorp/terraform-enterprise-helm/blob/main/docs/kubernetes_configuration.md
- HashiCorp Terraform Enterprise Helm chart upgrade documentation: https://github.com/hashicorp/terraform-enterprise-helm/blob/main/docs/upgrades_and_rollback.md

## Issues Found
- The prerequisite Kubernetes version was listed as 1.24+, but the current chart README states Kubernetes 1.25+ is the earliest tested version. Updated the prerequisite to 1.25+.
- The post omitted the image pull secret required for `images.releases.hashicorp.com`. Added a `kubectl create secret docker-registry` example and referenced it with `imagePullSecrets`.
- The database host secret omitted the PostgreSQL port expected by Terraform Enterprise examples. Updated it to include `:5432`.
- The values file used unsupported chart keys such as `image.repository` with the full image path, `tfe.hostname`, `tfe.license`, `tfe.encryption`, `tfe.database`, `tfe.objectStorage`, `tls.secretName`, and top-level probe fields. Replaced them with supported chart values: `image.repository`, `image.name`, `image.tag`, `tls.certificateSecret`, `env.variables`, `env.secretKeyRefs`, and `tfe.readinessProbe*`.
- The image tag was set to `latest`, but HashiCorp documentation says `latest` is not a valid Terraform Enterprise image tag. Replaced it with a pinned supported release tag.
- The Kubernetes deployment was described as using `external` operational mode, but current Terraform Enterprise documentation states Kubernetes deployments operate in `active-active` mode. Updated the environment configuration to `TFE_OPERATIONAL_MODE: active-active`.
- The ingress example omitted the chart-required per-path `serviceName` and `portNumber` values. Added both fields.
- The resource requests were below the chart defaults. Updated them to match the chart's documented default request values.
- The pod security context example put Linux capabilities under the pod-level security context. Replaced it with the non-root pod security context values documented by HashiCorp.
- The verification step used the deprecated `/_health_check` endpoint and an outdated expected JSON response. Replaced it with `/api/v1/health/readiness` and an HTTP `200 OK` expectation.
- The scaling example used an unsupported `podDisruptionBudget` key and a selector label that does not match the chart's deployment labels. Replaced it with the chart's `pdb` block and the `app: terraform-enterprise` label selector.
- The monitoring example used unsupported `podAnnotations`. Replaced it with the chart's `tfe.metrics` values, which enable metrics ports and Prometheus scrape annotations.
- The troubleshooting database command assumed `psql` exists in the Terraform Enterprise container. Replaced it with a temporary PostgreSQL client pod.

## Review Notes
The post is now aligned with the current HashiCorp Helm chart structure and current Terraform Enterprise health/readiness guidance. `kubectl` and `helm` were not installed in the local workspace, so CLI behavior was verified from official documentation rather than local `--help` output.
