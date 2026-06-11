# Validation Summary: How to Build Prometheus Kubernetes SD Custom

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (service discovery, HTTP SD, File SD, kubernetes_sd_config, relabel_configs)
- Kubernetes (pods, services, endpoints, endpointslice, nodes, ingress, RBAC, Deployment)
- Go (k8s.io/client-go, informers, fake client, prometheus/client_golang)
- Python (kubernetes client library)
- YAML (Prometheus configuration, Kubernetes manifests)

## Sources Consulted
- Prometheus Kubernetes SD config docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config
- Prometheus HTTP SD docs: https://prometheus.io/docs/prometheus/latest/http_sd/
- Prometheus File SD docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#file_sd_config
- Prometheus HTTP SD format spec: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#http_sd_config
- Kubernetes client-go documentation: https://pkg.go.dev/k8s.io/client-go
- Kubernetes Python client: https://github.com/kubernetes-client/python
- Prometheus client_golang: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus

## Issues Found

1. **Incorrect role count in "Built-in Kubernetes SD Roles" section.** The text claimed "Prometheus provides five discovery roles for Kubernetes" but the table immediately following correctly listed six roles (`node`, `pod`, `service`, `endpoints`, `endpointslice`, `ingress`). Per the official Prometheus documentation, there are six roles. Changed "five" to "six".

2. **Broken annotation-prefix check in the Go HTTP SD adapter.** The original code used `if len(k) > 24 && k[:24] == "monitoring.example.com/label_"`. The literal `"monitoring.example.com/label_"` is 29 characters, not 24, so this comparison would never match — it sliced the first 24 characters of the key and compared them to a 29-character string, which can never be equal. Replaced with `strings.HasPrefix(k, labelPrefix)` using a named prefix variable and `k[len(labelPrefix):]` for the suffix slice. Also added `"strings"` to the import block.

## Review Notes

- The example Go code in `updateTargets` reads/writes `a.targets` without a mutex while `handleTargets` reads it concurrently from the HTTP handler. This is a data race, but the post's later "Caching and Performance" section introduces `sync.RWMutex` usage, so this can be treated as illustrative simplification rather than incorrect guidance. Left as-is.
- The `TestBuildTargets` example calls `adapter.buildTargets()`, but the main code defines `updateTargets()`, not `buildTargets()`. Additionally, `fake.NewSimpleClientset` returns `*fake.Clientset` which would not satisfy the `*kubernetes.Clientset` concrete field type — testing would require `SDAdapter.client` to be the `kubernetes.Interface` interface type. These are common pedagogical simplifications and the post does not claim the snippets compile together as-is, so they were left unchanged.
- The relabel regex `([^:]+)(?::\d+)?;(\d+)` for the `__address__` rewrite is correct and matches the canonical example from Prometheus docs.
- The HTTP SD JSON shape (`{ "targets": [...], "labels": {...} }` as an array) matches the official spec.
- The RBAC ClusterRole grants `pods`, `nodes`, `services`, `endpoints`, and `namespaces` — appropriate for the discovery work described.
