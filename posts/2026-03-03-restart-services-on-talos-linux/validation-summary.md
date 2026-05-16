# Validation Summary: How to Restart Services on Talos Linux

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Talos Linux (v1.9 referenced)
- `talosctl` CLI
- Kubernetes (`kubectl`)
- Talos system services: `machined`, `apid`, `containerd`, `cri`, `etcd`, `kubelet`, `udevd`
- Static pods (kube-apiserver, kube-controller-manager, kube-scheduler)
- Kubernetes CronJob

## Sources Consulted
- [Talos v1.9 CLI reference](https://docs.siderolabs.com/talos/v1.9/reference/cli/)
- [Talos v1.9 architecture documentation](https://docs.siderolabs.com/talos/v1.9/learn-more/architecture/)
- [Talos containerd configuration documentation](https://docs.siderolabs.com/talos/v1.11/talos-guides/configuration/containerd/)
- [Talos v1.9 static pods documentation](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/images-container-runtime/static-pods)
- [Sidero Labs siderolabs/talos GitHub discussions and issues regarding kube-proxy and static pod recovery](https://github.com/siderolabs/talos)

## Issues Found

1. **kube-proxy incorrectly described as a static pod.** The "Restarting kubelet" bullet list said "Static pods (kube-proxy, etc.) may be restarted." In Talos, kube-proxy runs as a DaemonSet by default, not as a static pod. The actual static pods in Talos are the control plane components (kube-apiserver, kube-controller-manager, kube-scheduler), and they exist only on control plane nodes. Fixed by listing the correct static pods and noting they are re-read from disk and adopted by kubelet on restart (the containers themselves keep running under the CRI runtime, so they are typically not restarted just because kubelet bounces).

2. **"All pods continue running because they are managed by containerd, not kubelet"** is misleading — pods are a kubelet abstraction; what continues to run is the containers, which live under the CRI runtime independent of kubelet's lifecycle. Reworded for accuracy.

3. **`containerd` vs `cri` service confusion in the "Restarting containerd" section.** Talos has two separate containerd instances exposed as two services: the system `containerd` (Talos system extensions/containers) and `cri` (the containerd kubelet talks to for Kubernetes pods). The section's described impact ("all containers on the node are stopped and must be restarted by kubelet") describes the behavior of restarting `cri`, not the system `containerd`. Reworked the section to introduce both services, target `cri` in the disruption procedure, and note that the system `containerd` is less disruptive to Kubernetes workloads.

## Review Notes

- The `talosctl service <name> restart -n <node-ip>` syntax used throughout is correct.
- `talosctl etcd status`, `talosctl etcd members`, and `talosctl etcd snapshot <local-path>` are all correct. The snapshot path is local to the client running talosctl, which matches the example's `/tmp/etcd-before-restart.db`.
- The `talosctl patch machineconfig --patch '[…]'` JSON patch example is syntactically valid. Using `op: "add"` will succeed when the field does not already exist; for an already-set `audit-log-maxage`, `replace` would be needed. This is normal JSON Patch behavior and not an error.
- The CronJob image `ghcr.io/siderolabs/talosctl:v1.9.0` is plausible, but a production deployment of that CronJob would also need to mount a Talos config (`talosconfig`) for `talosctl` to authenticate to the Talos API. The example omits this for brevity. Worth noting if expanded in the future.
- The post pins `v1.9.0` in the CronJob image — future readers on newer Talos versions will want to bump this.
- The "Cascading Restarts" section's claim that restarting `containerd` may cascade to `cri`, `kubelet`, and running containers is plausible given service dependencies in Talos, but the exact cascade can depend on configuration and version. Left as-is since it is correctly framed as "may".
