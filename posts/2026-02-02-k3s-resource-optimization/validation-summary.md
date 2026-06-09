# Validation Summary: How to Optimize K3s Resource Usage

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Kubernetes (kubelet, kube-apiserver, kube-scheduler, kube-controller-manager)
- containerd
- etcd (embedded)
- SQLite / kine
- metrics-server
- systemd
- Traefik, ServiceLB, local-path provisioner (as disabled components)
- Kubernetes LimitRange and ResourceQuota
- Flannel CNI

## Sources Consulted
- K3s official documentation — https://docs.k3s.io/
- K3s Advanced configuration / containerd templates — https://docs.k3s.io/advanced
- K3s Packaged Components (disable flags) — https://docs.k3s.io/installation/packaged-components
- K3s Datastore documentation — https://docs.k3s.io/datastore
- K3s Configuration Options — https://docs.k3s.io/installation/configuration
- Kubernetes kube-apiserver reference — https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-scheduler config v1 — https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- metrics-server FAQ — https://github.com/kubernetes-sigs/metrics-server/blob/master/FAQ.md
- etcd configuration — https://etcd.io/docs/v3.6/op-guide/configuration/
- K3s GitHub releases (pause image versions) — https://github.com/k3s-io/k3s/releases

## Issues Found

1. **Wrong containerd config template path.** The post wrote `/etc/rancher/k3s/containerd/config.toml.tmpl`. The correct K3s path is `/var/lib/rancher/k3s/agent/etc/containerd/config.toml.tmpl`. Fixed in the toml code block header comment.

2. **Outdated / unnecessary `sandbox_image` pinning.** The template hard-pinned `sandbox_image = "rancher/mirrored-pause:3.6"`. K3s sets the pause image automatically for its bundled containerd, and 3.6 is older than what current K3s versions ship. Removed the `sandbox_image` line (and the associated comment) so K3s uses the version that matches the installed release.

3. **Incorrect claim about default datastore.** The post said K3s "uses SQLite by default for single-node deployments and embedded etcd for multi-node clusters." K3s actually defaults to SQLite (via kine) regardless of node count; embedded etcd must be opted into explicitly with `--cluster-init` (or required for HA). Rewrote that sentence to reflect the actual default behavior.

4. **Inverted cause/effect on `--metric-resolution`.** The metrics-server arg was set to `30s` with the comment "Reduce memory usage with shorter metric resolution". Shorter intervals mean more frequent scrapes and higher load, not lower. Changed the value to `60s` and rewrote the comment to "Longer interval between scrapes reduces kubelet load and memory pressure".

5. **"Throttling" example used upstream defaults.** The CPU optimization snippet set `max-requests-inflight=400` and `max-mutating-requests-inflight=200`, which are the kube-apiserver defaults — so the example didn't actually throttle anything. Lowered the values to 200 / 100 and updated the comment to make the throttling intent real.

6. **Two section headings missing `###` markdown markers.** "ResourceQuota for Namespace Budgets" and "Resource Monitoring Script" rendered as body text instead of subsections. Added the `###` prefix to both.

## Review Notes

- The post explicitly states "K3s v1.27 or later recommended." The kube-scheduler config `apiVersion: kubescheduler.config.k8s.io/v1` is GA from Kubernetes 1.25+ and is correct for that range.
- The `rancher/mirrored-metrics-server:v0.6.3` image still works but is older than the current `0.7.x` line; future revisions of this post may want to bump it.
- The `?_journal=WAL&_synchronous=NORMAL` query parameters on the SQLite datastore-endpoint URL are functionally redundant because kine already enables WAL journaling for SQLite by default. Left as-is since it does no harm and illustrates intent.
- The `--snapshot-count=5000` etcd flag is much lower than upstream default (100000); this trades more frequent snapshot writes for lower memory and smaller WAL files. Documented as written but worth flagging that the trade-off is non-trivial in disk-I/O-constrained environments.
- The pie chart percentages for "K3s Memory Distribution (Default)" are illustrative ballpark figures rather than measured values; treat them as such.
