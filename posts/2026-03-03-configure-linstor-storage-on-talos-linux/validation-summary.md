# Validation Summary: How to Configure LINSTOR Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config patches, system extensions, kubelet extraMounts)
- LINSTOR (storage management on top of DRBD)
- DRBD (kernel module, transport)
- Piraeus Operator v2 (Kubernetes operator for LINSTOR)
- Kubernetes (StorageClass, PVC, Deployment, VolumeSnapshot, VolumeSnapshotClass)
- Helm (operator installation)
- linstor-csi (CSI driver, StorageClass parameters)
- LVM (volume group / thin pool)

## Sources Consulted
- Piraeus Operator v2 reference docs — LinstorSatelliteConfiguration: https://piraeus.io/docs/stable/reference/linstorsatelliteconfiguration/
- Piraeus Operator v2 reference docs — LinstorCluster: https://piraeus.io/docs/stable/reference/linstorcluster/
- Piraeus Operator v2 — Talos how-to: https://piraeus.io/docs/stable/how-to/talos/ and https://github.com/piraeusdatastore/piraeus-operator/blob/v2/docs/how-to/talos.md
- Piraeus Operator v2 — Get Started tutorial: https://piraeus.io/docs/stable/tutorial/get-started/
- Piraeus Operator v2 — Helm install: https://piraeus.io/docs/v2/how-to/helm/
- Piraeus Operator v2 Helm chart on GHCR: oci://ghcr.io/piraeusdatastore/piraeus-operator/piraeus
- linstor-csi parameter source: https://github.com/piraeusdatastore/linstor-csi (pkg/volume/parameter.go)
- Piraeus components overview: https://piraeus.io/docs/v2/explanation/components/
- Sidero Labs DRBD system extension: https://github.com/siderolabs/extensions/tree/main/storage/drbd

## Issues Found
- **Incorrect Helm repository / chart for the Piraeus Operator.** The post used `helm repo add piraeus-charts https://piraeus.io/helm-charts/` and `helm install piraeus-charts/piraeus-operator`. The `piraeus.io/helm-charts/` repo (the `piraeusdatastore/helm-charts` repo) does not contain a `piraeus-operator` chart — it contains supporting charts (snapshot-controller, linstor-scheduler, piraeus-ha-controller, linstor-affinity-controller, linstor-cluster). The Piraeus Operator v2 chart lives in `piraeusdatastore/piraeus-operator` itself and is published as an OCI artifact at `oci://ghcr.io/piraeusdatastore/piraeus-operator/piraeus`. Replaced the `helm repo add` step with the OCI-based `helm upgrade --install` invocation that the project documents (added `--set installCRDs=true --wait`).
- **Incorrect deployment name in the rollout status check.** The Helm template names the operator deployment `<release-name>-controller-manager`. With release `piraeus-op`, the deployment is `piraeus-op-controller-manager`, not `piraeus-operator`. Updated the `kubectl rollout status` command accordingly.

## Review Notes
- The post installs the operator into a custom `piraeus-system` namespace. The Piraeus project's documented default is `piraeus-datastore`. Both work because `--create-namespace` is used, but if a reader follows other Piraeus docs they may see `piraeus-datastore` referenced — kept the post's `piraeus-system` choice unchanged since it is functionally valid.
- The `linstor.csi.linbit.com/placementCount` and `linstor.csi.linbit.com/autoPlace` StorageClass parameters are aliases in the linstor-csi driver (they both populate `PlacementCount`). Specifying both with the same value is redundant but harmless. Left as written.
- `LinstorSatelliteConfiguration.spec.storagePools` supports `lvmPool`, `lvmThinPool`, `filePool`, `fileThinPool`, `zfsPool`, and `zfsThinPool`. The post's usage of `fileThinPool` with `directory:` and `lvmThinPool` with `volumeGroup`/`thinPool` matches the schema.
- The DRBD system extension version `ghcr.io/siderolabs/drbd:9.2.6-v1.6.0` is a specific pinned tag. Such tags are tied to a particular Talos release and kernel; readers may need a different tag for their Talos version (the Talos Image Factory at `factory.talos.dev` is the canonical place to pick a matching one). Left as written since the post is a tutorial snapshot and the format is correct.
- Satellites in Piraeus v2 are managed per-`LinstorSatelliteConfiguration`. The `kubectl ... ds/linstor-satellite` commands in the Troubleshooting section assume a single DaemonSet name; depending on configuration selectors there may be multiple satellite DaemonSets. This is convention-aware rather than incorrect, so left unchanged.
- The `kubelet.extraMounts` path `/var/lib/linstor` is the conventional persistent location for LINSTOR state on Talos and matches the destination directory used by the `fileThinPool` example. Verified consistent.
