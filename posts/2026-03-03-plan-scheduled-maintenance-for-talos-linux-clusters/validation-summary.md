# Validation Summary: How to Plan Scheduled Maintenance for Talos Linux Clusters

## Status
validated

## Post Type
Guide / Tutorial — operational playbook for planning and executing scheduled maintenance on Talos Linux Kubernetes clusters.

## Technologies Covered
- Talos Linux (talosctl CLI, upgrades, rollback, etcd snapshot, health checks)
- Kubernetes (kubectl, drain/uncordon, CronJob, endpoints)
- etcd (snapshot/backup, defragmentation, status checks)
- YAML configuration / Kubernetes manifests
- Sidero Labs container images (ghcr.io/siderolabs/installer, ghcr.io/siderolabs/talosctl)

## Sources Consulted
- [Sidero Labs Talos v1.9 CLI Reference](https://docs.siderolabs.com/talos/v1.9/reference/cli/)
- [Talos source: pkg/machinery/resources/secrets](https://github.com/siderolabs/talos/tree/release-1.9/pkg/machinery/resources/secrets) (to verify certificate-related COSI resource types)
- [Talos source: kubernetes_certs.go](https://github.com/siderolabs/talos/blob/release-1.9/pkg/machinery/resources/secrets/kubernetes_certs.go) (`KubernetesDynamicCerts` is the actual resource type/short name)
- [Sidero Labs Upgrading Talos Linux docs](https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/lifecycle-management/upgrading-talos) (verified `talosctl rollback` semantics and A/B image scheme)
- [Monitoring the Kubernetes certificates on a Talos cluster (mteixeira)](https://mteixeira.wordpress.com/2025/12/07/monitoring-the-kubernetes-certificates-on-a-talos-cluster/) — confirms `talosctl config info` and `talosctl get KubernetesDynamicCerts -o yaml` as the correct commands
- [kubectl version --short deprecation/removal — kubernetes/kubectl#1216](https://github.com/kubernetes/kubectl/issues/1216) and [eksctl-io/eksctl#6995](https://github.com/eksctl-io/eksctl/issues/6995) — `--short` was deprecated in 1.24 and is no longer accepted as a flag in current kubectl releases
- Verified `kubectl drain`, `kubectl uncordon`, `kubectl get endpoints` flags via the official Kubernetes CLI documentation

## Issues Found
1. **`kubectl version --short` (Step 1 inventory command)** — The `--short` flag was deprecated in kubectl 1.24 and has been removed in recent kubectl releases; running it now returns `unknown flag: --short`. Fixed by changing the command to plain `kubectl version`, which now produces concise output by default. Users who need machine-readable output can use `-o yaml` or `-o json`.
2. **`talosctl get certificate -n <control-plane-ip>` (Step 4 pre-maintenance checklist)** — `certificate` is not a defined COSI resource type or alias in Talos. The certificate-related resources are `KubernetesDynamicCerts`, `KubernetesRoot`, `EtcdRoot`, `OSRoot`, `MaintenanceRoot`, and `CertSANs` (none of which is aliased as `certificate`). Replaced the line with two accurate commands: `talosctl config info` (for the talosctl client certificate expiry) and `talosctl get kubernetesdynamiccerts -n <control-plane-ip> -o yaml` (for the actual API server / kubelet client certificate material that can then be decoded with openssl).

## Review Notes
- The `talosctl health` command is still supported in Talos v1.9 and earlier (not deprecated as of this review), although there is a known issue (siderolabs/talos#12553) where `--wait-timeout` may not always behave as expected. The example usage in the post is fine.
- `talosctl rollback -n <node-ip>` is correct; Talos uses an A/B image scheme so it rolls back the boot reference to the previously installed image and reboots.
- `talosctl etcd snapshot <path>` syntax is correct (path is positional).
- `kubectl get endpoints` is still functional but the Endpoints API is being supplanted by EndpointSlices over the long term. Not changed because the command currently works on all supported Kubernetes versions and is only used here for a quick informational check.
- The CronJob example uses `ghcr.io/siderolabs/talosctl:v1.9.0`. In a real deployment the pod would need a mounted talosconfig and access to a control-plane endpoint for the `talosctl etcd snapshot` invocation to succeed, but this is an illustrative example and the command structure itself is correct.
- Talos v1.9.0 is a real released version. Newer Talos minor releases exist as of 2026-05-16, but the post does not claim 1.9.0 is the latest — it's used as a concrete example, which is fine.
