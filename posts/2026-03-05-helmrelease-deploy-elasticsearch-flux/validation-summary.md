# Validation Summary: How to Use HelmRelease for Deploying Elasticsearch with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD HelmRepository and HelmRelease
- Kubernetes
- Helm
- Elasticsearch
- Kibana
- Elastic standalone Helm charts

## Sources Consulted
- Flux HelmRelease v2 documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository v1 documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux helm-controller HelmRelease CRD: https://github.com/fluxcd/helm-controller/blob/main/config/crd/bases/helm.toolkit.fluxcd.io_helmreleases.yaml
- Elastic Helm repository index: https://helm.elastic.co/index.yaml
- Elastic Elasticsearch chart README and values: https://github.com/elastic/helm-charts/tree/main/elasticsearch
- Elastic Kibana chart README, values, and ingress template: https://github.com/elastic/helm-charts/tree/main/kibana
- Elastic Stack Helm chart / ECK documentation: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/managing-deployments-using-helm-chart
- Elasticsearch node roles documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/node-roles-overview.html

## Issues Found
- The article described the standalone Elastic Helm chart as a current production-ready recommendation. Updated the introduction to note that the standalone chart is fixed at Elasticsearch/Kibana 8.5.1 and that Elastic recommends ECK for new production Kubernetes deployments.
- The HelmRelease examples used `install.atomic` and `upgrade.atomic`, which are not valid Flux HelmRelease v2 fields. Removed those fields and kept valid remediation settings.
- The examples used `version: "8.5.x"` even though the Elastic repository publishes the standalone Elasticsearch and Kibana 8.x charts at `8.5.1`. Changed the examples to pin `8.5.1`.
- The Elasticsearch example included `minimumMasterNodes`, which the chart documents as ignored for Elasticsearch 7 and later. Removed it from the Elasticsearch 8.5.1 examples.
- The production Elasticsearch security configuration referenced a non-existent `elastic-certificates.p12` path and duplicated settings the 8.5.1 chart already injects when `createCert` is enabled. Replaced it with a safe Elasticsearch config example that does not conflict with the chart-generated TLS configuration.
- The listed node roles did not match the chart's default roles while the prose claimed all/default roles. Added the missing `data_cold`, `ml`, and `remote_cluster_client` roles and adjusted the wording.
- The lifecycle hook and verification curl commands used unauthenticated HTTP even though the chart defaults to HTTPS with generated credentials. Updated them to use HTTPS, `-k`, and the generated `elastic` password secret.
- The development example disabled `xpack.security.enabled` but did not disable chart certificate generation or switch the chart readiness protocol to HTTP. Added `createCert: false` and `protocol: http`.
- The Kibana example used `http://` for Elasticsearch and `ingressClassName`, which is not the value key used by the Kibana 8.5.1 chart. Updated it to `https://`, `className`, and chart-level `pathtype`.
- The `vm.max_map_count` tuning snippet used a custom `extraInitContainers` example even though the chart has built-in `sysctlInitContainer` and `sysctlVmMaxMapCount` values. Replaced it with the chart-supported values.

## Review Notes
Local `helm`, `kubectl`, and `flux` binaries were not installed, so CLI verification was performed against official Flux documentation, the Flux CRD schema, and the published Elastic chart sources. YAML code blocks were parsed successfully with PyYAML after the fixes.
