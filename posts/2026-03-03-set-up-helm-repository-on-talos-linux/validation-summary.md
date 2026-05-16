# Validation Summary: How to Set Up Helm Repository on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Helm repositories
- Helm OCI registries
- ChartMuseum
- Harbor
- Kubernetes Ingress and persistent volume claims

## Sources Consulted
- Helm `repo add` command documentation: https://v3.helm.sh/docs/v3/helm/helm_repo_add/
- Helm `search` command documentation: https://helm.sh/docs/helm/helm_search/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Helm `repo index` command documentation: https://helm.sh/docs/helm/helm_repo_index/
- Helm provenance and `verify` documentation: https://helm.sh/docs/helm/helm_verify/
- ChartMuseum documentation: https://chartmuseum.com/docs/
- ChartMuseum Helm chart values: https://github.com/chartmuseum/charts/blob/main/src/chartmuseum/values.yaml
- Harbor Helm chart documentation and values: https://github.com/goharbor/harbor-helm
- Harbor 2.8 ChartMuseum removal notice: https://goharbor.io/blog/harbor-2.8/
- Talos / Sidero local storage documentation: https://docs.siderolabs.com/kubernetes-guides/csi/local-storage

## Issues Found
- The `helm repo list` comment said the output includes repository status. Helm lists repository names and URLs, so the comment was corrected.
- The ChartMuseum values placed `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` under `env.open`; the current ChartMuseum chart expects secret environment values under `env.secret`. The values snippet was corrected.
- The ChartMuseum values used `service.servicePort`, but the chart uses `service.externalPort`. The service value was corrected.
- The ChartMuseum values used a top-level `ingress.tls` list, but the chart expects TLS settings on each ingress host. The ingress snippet was corrected to use per-host `tls` and `tlsSecret`.
- The ChartMuseum local storage root was `/charts` but the persistence mount path was left at the chart default. The snippet now sets `persistence.path: /charts`.
- The examples assumed a `local-path` StorageClass without stating the prerequisite. Notes were added that the StorageClass must already be installed on the Talos cluster.
- The Harbor example enabled `chartmuseum`, but Harbor removed ChartMuseum starting in v2.8 and now serves Helm charts as OCI artifacts. The Harbor section was updated to describe OCI chart storage and the removed ChartMuseum values were deleted.
- The ingress examples used the deprecated `kubernetes.io/ingress.class` annotation. They were updated to current chart-supported ingress class fields.

## Review Notes
The post is technically valid after the corrections. The examples still use placeholder domains, credentials, and storage classes, so readers must replace them with environment-specific values before deployment.
