# Validation Summary: How to Use kubectl top for Resource Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Metrics Server
- Metrics API
- Bash scripting
- Prometheus Node Exporter textfile collector
- minikube

## Sources Consulted
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Kubernetes resource metrics pipeline documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Metrics Server official repository and installation documentation: https://github.com/kubernetes-sigs/metrics-server
- Metrics Server official documentation site: https://kubernetes-sigs.github.io/metrics-server/
- Kubernetes Hello Minikube tutorial for metrics-server addon: https://kubernetes.io/docs/tutorials/hello-minikube/
- Prometheus Python client textfile collector documentation: https://prometheus.github.io/client_python/exporting/textfile/

## Issues Found
- The post described `kubectl top` output as "real-time" and "what is happening right now." Kubernetes documents metrics pipeline delay and notes that pod metrics may be unavailable for a few minutes after creation, so this was changed to "recent" resource usage.
- The partial metrics section said metrics take approximately 60 seconds after pod start. Kubernetes documentation says metrics can be unavailable for a few minutes, so the wording was corrected.
- The Metrics Server Deployment patch placed `containers` directly under `spec`, which is not the correct Deployment path. It was changed to `spec.template.spec.containers`.
- The over-provisioning script treated CPU values without an `m` suffix as millicores and used integer shell arithmetic for CPU requests such as `0.5`, which would fail or produce incorrect results. The script now converts whole-core CPU values to millicores with `awk`.
- The Prometheus export script only stripped `m` from CPU and `Mi` from memory, which produced incorrect values for whole-core CPU values or memory reported as `Ki`/`Gi`. Conversion helpers were added for common `kubectl top` units.
- The quick health check script only handled CPU values ending in `m` and memory values ending in `Mi`. It now handles whole-core CPU and `Ki`/`Mi`/`Gi` memory values.

## Review Notes
- The `kubectl top` flags used in the post (`--sort-by`, `--containers`, `--no-headers`, `-A`, and label selectors) match current Kubernetes documentation.
- The comparison scripts still compare pod-level usage against the first container's resource request, and the comments now state that explicitly. A future improvement would be to sum requests across all containers for multi-container pods.
