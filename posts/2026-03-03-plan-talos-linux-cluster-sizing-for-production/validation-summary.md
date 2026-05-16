# Validation Summary: How to Plan Talos Linux Cluster Sizing for Production

## Status
validated

## Post Type
Guide / Capacity-planning reference

## Technologies Covered
- Talos Linux (machine configuration, kubelet, etcd, install)
- Kubernetes (control plane, kubelet, HPA, Cluster Autoscaler)
- etcd (WAL, fsync latency, default quota, sizing)
- kubectl (top, describe, apply)
- Container runtimes / DaemonSets / CNI

## Sources Consulted
- Talos Linux machine configuration reference (https://www.talos.dev/v1.7/reference/configuration/)
- etcd hardware recommendations and tuning docs (https://etcd.io/docs/v3.5/op-guide/hardware/ and https://etcd.io/docs/v3.5/tuning/)
- Kubernetes Cluster Autoscaler on AWS docs (https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler/cloudprovider/aws)
- Kubernetes registry.k8s.io image namespace (https://github.com/kubernetes/autoscaler/releases)
- kubelet KubeletConfiguration reference (https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- Cross-references against sibling posts in this blog:
  - posts/2026-03-03-set-kubelet-extra-config-in-talos-linux/README.md (confirms `extraConfig` is preferred over `extraArgs` for these fields)
  - posts/2026-03-03-set-up-etcd-advertised-subnets-in-talos-linux/README.md (confirms `cluster.etcd.advertisedSubnets`)
  - posts/2026-03-03-set-machine-install-disk-in-talos-linux-configuration/README.md (confirms `machine.install.disk`)

## Issues Found
1. **Missing markdown header for "Resource Reservations"** — the section title was on a plain line with no `##` prefix, so it would render as body text. Changed to `## Resource Reservations` to match the surrounding heading levels.
2. **Kubelet resource reservation configured via `extraArgs` with deprecated dotted flag names** — the snippet used `machine.kubelet.extraArgs` with `system-reserved`, `kube-reserved`, and `eviction-hard` strings. While the kubelet still accepts these flags, Talos's own kubelet guide in this same blog explicitly recommends `extraConfig` (the structured KubeletConfiguration) for these fields. Rewrote the snippet to use `extraConfig` with the canonical camelCase keys `systemReserved`, `kubeReserved`, and `evictionHard`, matching how the same settings are presented in `set-kubelet-extra-config-in-talos-linux`.

Spot-checked arithmetic and they pass:
- `(100 * 0.5) + (10 * 2) = 70 cores`, `(100 * 0.512) + (10 * 4) = 91.2 GB`, `+20% ≈ 84 CPU / ~110 GB` ✓
- etcd estimate `10 MB + 0.5 MB + 5 MB = 15.5 MB ≈ 16 MB` ✓

Confirmed correct as written:
- etcd default backend quota is 2 GiB.
- etcd p99 fsync target of <10 ms aligns with upstream guidance.
- Cluster Autoscaler image `registry.k8s.io/autoscaling/cluster-autoscaler:v1.29.0` and arg formats (`--nodes=min:max:nodeGroupName`, `--scale-down-utilization-threshold`, `--scale-down-delay-after-add`) are valid.
- `cluster.controlPlane.endpoint`, `cluster.etcd.advertisedSubnets`, and `machine.install.disk` are valid Talos config fields.
- "No SSH / immutable OS" claim is accurate for Talos.
- Quorum statements for 1/3/5/7 control plane nodes are correct.

## Review Notes
- The control plane sizing table is presented as Talos-specific but the numbers are essentially general Kubernetes/etcd recommendations; that's fine for a sizing guide but readers should remember Talos's actual base overhead is lower than a typical distro.
- `kubectl describe nodes | grep -A5 "Conditions:"` works, but a future revision could prefer `kubectl get nodes -o jsonpath` for more reliable scripting.
- The cluster autoscaler example pins `v1.29.0`; readers on newer Kubernetes versions should match the autoscaler minor version to their cluster's minor version.
- The post does not mention Talos's `--preserve` / disk wipe semantics around the ephemeral partition; not an error, just out of scope.
