# Validation Summary: How to Deploy Grafana with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu / Terraform
- Grafana
- Kubernetes
- Helm (and Helm provider for Terraform)
- Kubernetes provider for Terraform
- cert-manager / NGINX Ingress
- Prometheus, Loki (referenced as data sources)
- SMTP (for Grafana alerting)

## Sources Consulted
- Grafana Helm chart repository: https://github.com/grafana/helm-charts/tree/main/charts/grafana
- Grafana Helm chart values.yaml: https://github.com/grafana/helm-charts/blob/main/charts/grafana/values.yaml
- Terraform Helm provider docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- Terraform Helm provider `helm_release` resource docs (timeout argument)
- Terraform Kubernetes provider `kubernetes_ingress_v1` resource docs
- Kubernetes Ingress API reference (path types: Prefix / Exact / ImplementationSpecific)
- Grafana documentation for environment-variable configuration (`GF_<SECTION>_<KEY>` pattern, including `[smtp]` section)
- Grafana.com dashboards listing for IDs 7249 (Kubernetes Cluster) and 1860 (Node Exporter Full)

## Issues Found
No technical issues found.

Specific items verified:
- Grafana Helm chart version `7.2.3` exists (releases `grafana-7.2.0` through `grafana-7.2.5` published).
- For `helm` provider `~> 2.12`, the nested `kubernetes { ... }` block syntax is correct (attribute-style `kubernetes = { ... }` is only required in provider v3.x).
- All values keys used (`adminUser`, `adminPassword`, `persistence`, `datasources`, `dashboardProviders`, `dashboards`, `envFromSecret`) are valid keys in the Grafana Helm chart's values schema.
- `helm_release` `timeout = 300` is valid (seconds; 300 is also the documented default).
- `kubernetes_ingress_v1` arguments (`path_type = "Prefix"`, `tls`, `rule`, `backend.service.port.number`) match the provider schema.
- Grafana SMTP environment variable names (`GF_SMTP_HOST`, `GF_SMTP_USER`, `GF_SMTP_PASSWORD`) follow the documented `GF_<SECTION>_<KEY>` mapping for the `[smtp]` section.
- Dashboard IDs 7249 ("Kubernetes Cluster") and 1860 ("Node Exporter Full") are valid Grafana.com community dashboards.

## Review Notes
- The annotation `kubernetes.io/ingress.class` used in the Ingress example is deprecated since Kubernetes 1.18 in favor of `spec.ingressClassName` / `IngressClass` resources. It is still functional on most current ingress controllers (including NGINX), so this isn't a hard error, but readers on newer clusters may prefer the modern form.
- Helm provider `2.x` is being superseded by `3.x` in newer releases; the post correctly pins `~> 2.12`, but readers upgrading should be aware that the `kubernetes` block becomes an attribute (`kubernetes = { ... }`) in v3.x.
- The Grafana Helm chart has continued to evolve since `7.2.3`; pinning is good practice (and the post recommends it), but readers building new deployments may want to evaluate a more recent chart minor/major release.
- The phrasing "Enable `disableDeletion = false` ... set to `true` only after stabilizing your dashboard set" is logically correct (allow deletion during setup, then lock dashboards down) but slightly awkward; not a technical error.
- `wait = true` is the default for `helm_release`, so it is redundant but harmless.
