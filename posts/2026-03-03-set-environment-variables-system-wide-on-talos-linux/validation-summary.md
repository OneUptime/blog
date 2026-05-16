# Validation Summary: How to Set Environment Variables System-Wide on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration `machine.env`, `machine.kubelet`, `cluster.etcd`)
- talosctl CLI (`gen config`, `apply-config`, `patch machineconfig`, `get machineconfig`, `read`, `services`)
- Kubernetes (Pod, ConfigMap, Secret, DaemonSet, environment variables, envFrom, valueFrom/fieldRef/secretKeyRef)
- Containerd / CRI configuration
- HTTP/HTTPS/NO proxy conventions

## Sources Consulted
- [Talos v1.9 Configuration Reference (machine.env, kubelet)](https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/)
- [Talos v1.8 Configuration Reference](https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/)
- [Talos v1.12 Corporate Proxies guide](https://docs.siderolabs.com/talos/v1.12/networking/corporate-proxies)
- [Talos Containerd guide](https://www.talos.dev/v1.11/talos-guides/configuration/containerd/)
- [Sidero Node Labels and Taints docs](https://docs.siderolabs.com/kubernetes-guides/advanced-guides/node-labels)
- Kubernetes documentation for Pod env, envFrom, ConfigMap, Secret, and Downward API field refs (standard, verified)

## Issues Found
- **Removed the "Container Runtime Environment Variables" section** that suggested setting `CONTAINERD_SNAPSHOTTER: "overlayfs"` under `machine.env` to affect containerd behavior. This was technically incorrect: containerd in Talos does not read a `CONTAINERD_SNAPSHOTTER` environment variable for snapshotter selection. The snapshotter is configured via the CRI config (e.g. `[plugins."io.containerd.grpc.v1.cri".containerd] snapshotter = "overlayfs"`), typically placed in `/var/cri/conf.d/` or via the `machine.files`/CRI machine-config fields. Leaving the example would have misled readers into believing a non-functional env var changes runtime behavior.

## Review Notes
- Talos officially documents `machine.env` keys as `GRPC_GO_LOG_VERBOSITY_LEVEL`, `GRPC_GO_LOG_SEVERITY_LEVEL`, `http_proxy`, `https_proxy`, and `no_proxy` (lowercase). The post uses the uppercase variants (`HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`). Talos passes the values through and Go programs typically read uppercase variants, so the uppercase form works in practice; however, the documented convention for Talos is lowercase. Both cases coexist in the ecosystem and many users set both — not strictly an error, so left as-is.
- `machine.nodeLabels` is the preferred and cleaner mechanism for node labels in current Talos versions; passing `--node-labels` via `machine.kubelet.extraArgs` (as shown in the post) still works but is considered the alternative approach.
- The `talosctl read --nodes <node> /proc/1/environ` example is valid; in Talos PID 1 is `machined` and inherits the `machine.env` values, so this is a reasonable verification step (the output is NUL-separated, which the reader may want to filter with `tr '\0' '\n'` for readability — not added to keep edits minimal).
- All Kubernetes manifests (Pod, ConfigMap, Secret, DaemonSet, Downward API `fieldRef` paths like `metadata.name`, `metadata.namespace`, `spec.nodeName`, `status.podIP`) are syntactically and semantically correct against current Kubernetes APIs.
- The `cluster.etcd.extraArgs` example (`quota-backend-bytes`, `auto-compaction-retention`) maps to valid etcd flags; the post correctly notes these are flags rather than env vars.
