# Validation Summary: How to Use DaemonSet with multiple containers for complementary node services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes DaemonSet
- Kubernetes Pods and multi-container pod patterns
- Kubernetes hostPath and emptyDir volumes
- Prometheus exporters
- Envoy service mesh proxy patterns
- Kubernetes CSI sidecars
- Falco
- Trivy

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Pod documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus Node Exporter repository: https://github.com/prometheus/node_exporter
- cAdvisor repository and releases: https://github.com/google/cadvisor
- Kubernetes CSI node-driver-registrar documentation: https://kubernetes-csi.github.io/docs/node-driver-registrar.html
- Kubernetes CSI livenessprobe documentation: https://kubernetes-csi.github.io/docs/livenessprobe.html
- Falco Kubernetes operator documentation: https://falco.org/docs/setup/operator/
- Falco installation documentation: https://falco.org/docs/setup/packages/
- Trivy image command documentation: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy rootfs command documentation: https://trivy.dev/latest/docs/references/configuration/cli/trivy_rootfs/
- Istio data plane mode documentation: https://istio.io/latest/docs/overview/dataplane-modes/
- Istio ambient Helm installation documentation: https://istio.io/latest/docs/ambient/install/helm/

## Issues Found
- The monitoring example scraped port `9100` even though it included a `metrics-aggregator` on port `9999`. Changed the Prometheus scrape port annotation to `9999` so the manifest matches the described aggregation pattern.
- The monitoring example used older exporter image tags and an older cAdvisor registry path. Updated Node Exporter, process-exporter, and cAdvisor images to current release lines and the current cAdvisor `ghcr.io` registry.
- The service mesh example mixed Istio sidecar setup commands with a node-level DaemonSet pattern and used Istio images in ways that would not accurately represent Istio's documented sidecar or ambient data plane modes. Reworked the snippet into a generic Envoy node-proxy DaemonSet with telemetry, security, and config-sync sidecars, and changed the explanatory claim from "complete service mesh functionality" to an illustrative node-local proxy pattern.
- The CSI example used outdated CSI sidecar image versions. Updated `csi-node-driver-registrar` to `v2.13.0` and `livenessprobe` to `v2.15.0`, matching current stable CSI sidecar documentation.
- The security scanning example attempted to run `trivy image` over `$(crictl images -q)`, which would pass multiple image IDs and assumes `crictl` is present in the Trivy image. Replaced it with `trivy rootfs` over a read-only host root mount and updated the surrounding description to "host vulnerability scanning."

## Review Notes
The manifests are syntactically valid YAML and use current Kubernetes `apps/v1` DaemonSet APIs. Several images remain illustrative placeholders such as `example/log-exporter`, `example/metrics-aggregator`, and `example/csi-driver`, so the examples still require real images, ConfigMaps, RBAC, namespaces, and environment-specific security review before production use.
