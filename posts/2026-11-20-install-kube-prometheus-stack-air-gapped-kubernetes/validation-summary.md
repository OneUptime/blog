# Validation summary

Reviewed 20 November 2026. The tutorial uses chart 93.6.0 with Operator v0.95.2 for a fresh-install example.

## Checks performed

- Helm 3.12.3 rendered complete pinned chart with article YAML: 136 documents
- Ruby Psych parsed all rendered YAML documents
- All 11 image references including Operator reloader argument use internal registry
- Prometheus and Alertmanager custom resources include monitoring-pull secret
- Article YAML matches locally rendered values file exactly
- All bash blocks pass bash -n
- Mermaid flowchart node definitions and edge references checked structurally
- 1280x720 social image visually inspected: complete readable title without clipping

The chart SHA-256 is `4a87c1548d9b6a56558ed0c028f266e6b70312b5d62f277f33ce78342a05a783`. The image inventory comes from the exact local render, including admission hooks, custom resources and the reloader argument. No image registry contents were verified.

## Limitations

- No image downloads or Skopeo transfers performed
- No live Kubernetes installation, API validation, registry authentication, architecture verification, persistence or notification tests
- Mermaid diagram not browser-rendered
- Grafana configuration not exercised by a running Grafana process

## Official sources reviewed

- https://github.com/prometheus-community/helm-charts/releases/tag/kube-prometheus-stack-93.6.0
- https://prometheus-operator.dev/docs/api-reference/api/
- https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- https://helm.sh/docs/helm/helm_template/
- https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
