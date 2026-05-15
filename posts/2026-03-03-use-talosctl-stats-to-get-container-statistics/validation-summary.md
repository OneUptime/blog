# Validation Summary: How to Use talosctl stats to Get Container Statistics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- talosctl
- containerd / CRI container runtime metrics
- Kubernetes
- kubectl
- Metrics Server
- Bash

## Sources Consulted
- Official Talos CLI reference for `talosctl stats`, `talosctl containers`, and `talosctl memory`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos `talosctl stats` implementation: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/stats.go
- Talos container stats API and runtime implementation: https://github.com/siderolabs/talos
- Official Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Official Kubernetes Metrics Server documentation: https://kubernetes-sigs.github.io/metrics-server/

## Issues Found
- The post showed an outdated or incorrect `talosctl stats` output shape with `NAMESPACE`, `ID`, `MEM(MB)`, `CPU`, and `DISK(MB)`. Current Talos output includes `NODE`, `NAMESPACE`, `ID`, `MEMORY(MB)`, and `CPU`, with no disk column. Updated the example output and metric explanations.
- The post described CPU as a percentage of one CPU core. Talos reports cumulative CPU usage from the runtime, not an instantaneous percentage. Updated the explanation and changed CPU-related examples to say "cumulative CPU usage."
- Several sort and parsing examples used fixed column numbers that did not match current output and could break when Talos renders child containers with a marker in the ID column. Updated the examples to sort and parse from the end of each row.
- The post described `talosctl stats` as querying containerd directly in all cases. Updated wording to "container runtime" because Kubernetes namespace stats use the CRI path.
- The system-container overhead section implied all Kubernetes components are system containers. Updated it to clarify that Kubernetes pod containers, including control plane static pods, are shown in the `k8s.io` namespace with `-k`.

## Review Notes
The right-sizing example uses `.spec.containers[0]`, so it only displays the first container in each pod. That is acceptable as a compact example, but a future improvement could show all containers in multi-container pods.
