# Validation Summary: How to Migrate from Rancher RKE to Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Talos Linux (talosctl, machine config v1alpha1, installer image)
- Rancher RKE (RKE1, `rke` CLI, cluster.yml)
- Rancher (catalog CRDs, projects, apps)
- Kubernetes (kubectl, CNI, ingress, RBAC)
- etcd (snapshot save / restore via etcdctl)
- Velero (backup/restore, AWS plugin)
- Cilium (Helm install, kube-proxy replacement)
- ingress-nginx (Helm install)
- cert-manager (Helm install, CRDs)
- kube-prometheus-stack (Helm install)
- Argo CD (manifest install)

## Sources Consulted
- Talos CLI reference (v1.9): https://www.talos.dev/v1.9/reference/cli/
- Talos v1alpha1 config reference: https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- siderolabs/talos source (release-1.9, release-1.10): `cmd/talosctl/cmd/mgmt/gen/config.go`
- RKE1 one-time etcd snapshots: https://rke.docs.rancher.com/etcd-snapshots/one-time-snapshots
- etcd v3.5 disaster recovery (ETCDCTL_API): https://etcd.io/docs/v3.5/op-guide/recovery/
- velero-plugin-for-aws README: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Cilium kube-proxy-free docs: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- cert-manager Helm chart values: https://github.com/cert-manager/cert-manager/blob/master/deploy/charts/cert-manager/values.yaml
- Rancher API docs (projects, catalog v2): https://ranchermanager.docs.rancher.com/

## Issues Found

1. **Manual etcd snapshot missing `ETCDCTL_API=3`** — The `docker exec etcd etcdctl snapshot save ...` command requires `ETCDCTL_API=3` to use the v3 snapshot subcommand reliably on etcd v3.4/v3.5 (the versions RKE1 ships). Added `-e ETCDCTL_API=3` to the `docker exec` invocation.

2. **etcd snapshot file not accessible to scp** — The snapshot is written to `/tmp/etcd-snapshot.db` *inside* the etcd container. The subsequent `scp user@rke-node:/tmp/etcd-snapshot.db ./` would fail because that path doesn't exist on the host (RKE's etcd container does not bind-mount `/tmp`). Added a `docker cp etcd:/tmp/etcd-snapshot.db /tmp/etcd-snapshot.db` step before the scp.

3. **Velero install missing `--plugins` for AWS provider** — `velero install --provider aws ...` without `--plugins` will deploy Velero with no object-store plugin, and backups to S3 will fail. Added `--plugins velero/velero-plugin-for-aws:v1.10.0` (the current stable AWS plugin for Velero 1.14.x).

## Review Notes

- `talosctl gen config ... --output-dir _out` still works in v1.9/v1.10 but the flag is now marked hidden in the binary; the documented form is `--output` / `-o`. Left as-is since it functions correctly today, but a future Talos release could remove the alias.
- The Talos installer image `ghcr.io/siderolabs/installer:v1.9.0` is valid; as of mid-2026 Talos has newer minor releases (v1.10+), so readers may want to pin a more recent version.
- The Cilium install snippet uses `kubeProxyReplacement=true` which is correct for Cilium 1.14+ (string values `strict`/`partial`/`disabled` are deprecated). For full kube-proxy replacement Cilium also needs `k8sServiceHost` and `k8sServicePort` to be set — the example would benefit from a note about that for production use.
- The cert-manager `crds.enabled=true` value is correct for cert-manager v1.15+; older v1.14 and below used `installCRDs=true` (still works as a back-compat alias).
- Rancher CRD names `apps.catalog.cattle.io` and `projects.management.cattle.io` are correct for Rancher 2.5+.
- The post correctly states that Talos uses containerd directly and has no Docker daemon or SSH — both verified against Talos architecture docs.
