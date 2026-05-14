# Validation Summary: How to Deploy Thanos with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Thanos
- Bitnami Thanos Helm chart
- Kubernetes
- HelmRelease, HelmRepository, and Kustomization custom resources
- Prometheus Operator and kube-prometheus-stack
- SOPS
- Grafana Operator
- S3-compatible object storage

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Prometheus Operator Thanos guide: https://prometheus-operator.dev/docs/platform/thanos/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Bitnami Thanos chart source and values: https://github.com/bitnami/charts/tree/main/bitnami/thanos
- Bitnami Thanos chart repository index: https://charts.bitnami.com/bitnami/index.yaml
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Thanos Query documentation: https://thanos.io/tip/components/query.md/
- Thanos Rule documentation: https://thanos.io/tip/components/rule.md/
- Thanos GitHub releases: https://github.com/thanos-io/thanos/releases
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Operator datasource examples: https://grafana.github.io/grafana-operator/docs/examples/datasource/

## Issues Found
- The object storage secret was created only in the `thanos` namespace, but the Prometheus Operator sidecar configuration references a Secret in the Prometheus workload namespace. I updated the example to create the same `thanos-objstore-config` Secret in both `thanos` and `monitoring`.
- The Prometheus example used a literal `replica: "$(POD_NAME)"` external label. I changed it to `replicaExternalLabelName: replica`, which is the kube-prometheus-stack/Prometheus Operator field for generating a per-replica external label suitable for Thanos deduplication.
- The Prometheus local retention was set to `2h` and described as the minimum for Thanos. I changed it to `6h` and softened the wording so there is enough local retention for block upload and recent queries.
- The Thanos sidecar image was pinned to `v0.35.0`, which is old for a 2026 guide. I updated it to `v0.41.0`, the latest Thanos release available during validation.
- The Thanos HelmRelease pinned the Bitnami chart to `15.x`, while the current Bitnami chart series is `17.x`. I updated the example to `17.x`.
- The Thanos Query configuration manually listed sidecar and store gateway endpoints while the Bitnami chart has first-class DNS discovery fields and automatically discovers the enabled store gateway. I updated the example to use `query.dnsDiscovery.sidecarsService`, `query.dnsDiscovery.sidecarsNamespace`, and `query.replicaLabel`.
- The Flux Kustomization set `targetNamespace: thanos` even though the directory contains resources that intentionally belong in `flux-system`, `thanos`, and `monitoring`. I removed `targetNamespace` so the explicit manifest namespaces are preserved.
- The conclusion claimed "unlimited" retention. I changed it to "long-term" retention because storage capacity and configured compactor retention still bound the deployment.

## Review Notes
- The Flux API versions in the examples, including `source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `kustomize.toolkit.fluxcd.io/v1`, are current.
- The Thanos S3 object storage structure, including `sse_config` with `SSE-S3`, matches current Thanos documentation.
- The Grafana datasource custom query parameters are valid for a Prometheus datasource, but the Grafana Operator label selector is deployment-specific and must match the user's Grafana instance labels.
- Local `helm`, `flux`, and `sops` binaries were not installed in the review workspace, so CLI behavior was checked against official documentation and source chart values. The YAML snippets in the post were parsed successfully after the corrections.
