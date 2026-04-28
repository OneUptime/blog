# Validation Summary: How to Deploy Nexus Repository with OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Sonatype Nexus Repository Manager (chart `nexus-repository-manager` v64.2.0)
- Helm (Terraform `hashicorp/helm` provider ~> 2.12)
- Kubernetes (Terraform `hashicorp/kubernetes` provider ~> 2.24, `kubernetes_ingress_v1` resource)
- NGINX Ingress Controller
- cert-manager
- Nexus Repository REST API (`/service/rest/v1/repositories/maven/proxy`)
- Maven Central proxy repository

## Sources Consulted
- Sonatype helm3-charts repository: https://github.com/sonatype/helm3-charts
- Sonatype `nxrm3-helm-repository` (archived 2024-02-27): https://github.com/sonatype/nxrm3-helm-repository
- Nexus Repository Manager Helm chart values.yaml (sonatype/nxrm3-helm-repository main branch)
- Artifact Hub listing for `nexus-repository-manager` 64.2.0: https://artifacthub.io/packages/helm/sonatype/nexus-repository-manager
- Sonatype Repositories API documentation: https://help.sonatype.com/en/repositories-api.html
- Sonatype community/support discussions on required fields for `POST /service/rest/v1/repositories/maven/proxy` (versionPolicy, layoutPolicy, httpClient)
- Terraform Registry: hashicorp/helm provider (v2.x and v3.x release notes)
- Terraform Registry: hashicorp/kubernetes provider docs for `kubernetes_ingress_v1`

## Issues Found
- **Missing required `maven` object in the Maven proxy REST API body.** The original `curl` payload sent to `POST /service/rest/v1/repositories/maven/proxy` did not include a `maven` object. Sonatype requires `maven.versionPolicy` (e.g. `RELEASE`, `SNAPSHOT`, `MIXED`) and `maven.layoutPolicy` (`STRICT` or `PERMISSIVE`) for Maven repositories, and the request returns HTTP 400 without them. Fix: added `"maven": { "versionPolicy": "RELEASE", "layoutPolicy": "STRICT" }` to the JSON body so the call actually succeeds against a real Nexus instance.

## Review Notes
- The Sonatype `nexus-repository-manager` Helm chart (single-instance OSS/Pro) used in this guide was archived by Sonatype on 2024-02-27. Version 64.2.0 still exists and is installable from `https://sonatype.github.io/helm3-charts/`, and the values keys used in the post (`nexus.docker.registries[].host/port`, `persistence.storageClass`, `persistence.storageSize`, `ingress.hostRepo`, `ingress.annotations`) match the chart's `values.yaml`. For new production deployments Sonatype now recommends the HA chart at `sonatype/nxrm3-ha-repository` (which requires an external PostgreSQL). Worth flagging in a future revision but not a correctness issue for what the post demonstrates.
- The Terraform `hashicorp/helm` provider has since released v3.x (3.0/3.1), which switches to plugin-framework and represents `kubernetes`/`registry`/`experiments` as nested objects rather than blocks. The post's `~> 2.12` constraint pins to the v2 line, so the `provider "helm" { kubernetes { ... } }` block syntax shown is correct for the version it targets. If a reader bumps to v3, they will need to migrate per the v3 upgrade guide.
- Default Helm service name `nexus-nexus-repository-manager` referenced by the second ingress matches `<release-name>-<chart-name>` for `helm_release.name = "nexus"` and chart `nexus-repository-manager`.
- Persistence default in the chart is `8Gi`; the post's override to `200Gi` is reasonable for a real artifact cache and matches the Best Practices section.
- The `nginx.ingress.kubernetes.io/proxy-body-size: "0"` annotation correctly disables NGINX's request body size limit, which is needed for large artifact uploads.
- `kubernetes.io/ingress.class` annotation is deprecated in favor of `spec.ingressClassName` on `kubernetes_ingress_v1`; both still work on most NGINX Ingress installs but using `ingress_class_name` would be cleaner. Left as-is since it remains functional.
