# Validation Summary: How to Deploy OpenEBS with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenEBS
- OpenEBS LocalPV Hostpath
- OpenEBS Replicated PV Mayastor
- Flux CD
- Kubernetes StorageClass, PersistentVolumeClaim, Deployment, and Kustomization resources
- Helm and Flux HelmRelease
- FIO

## Sources Consulted
- OpenEBS Installation documentation: https://openebs.io/docs/quickstart-guide/installation
- OpenEBS Prerequisites documentation: https://openebs.io/docs/main/quickstart-guide/prerequisites
- OpenEBS Replicated PV Mayastor DiskPool documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-diskpool
- OpenEBS Replicated PV Mayastor StorageClass documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-storageclass
- OpenEBS Replicated PV Mayastor StorageClass parameters documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-storage-class-parameters
- OpenEBS Helm chart repository and values: https://openebs.github.io/openebs/
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- Updated the OpenEBS Helm chart version from `4.0.x` to `4.4.x` so the guide uses the current stable OpenEBS 4.x documentation and CRDs.
- Corrected OpenEBS Helm values: moved engine selection to `engines.*`, removed obsolete legacy `cstor` and `jiva` values, removed unsupported `deviceClass`, and replaced Mayastor HugePage resource keys with the chart's `hugepages2Mi` values key.
- Replaced the HugePages DaemonSet with node-level HugePages and `nvme-tcp` setup commands. OpenEBS documents that kubelet must see the HugePage capacity, so changing HugePages from an in-cluster DaemonSet is not sufficient for a reliable deployment.
- Added Mayastor node labeling with `openebs.io/engine=mayastor`, matching the default IO engine node selector.
- Removed the unsupported Mayastor StorageClass parameter `ioTimeout`; current documented StorageClass parameters include `protocol`, `repl`, `thin`, `allowVolumeExpansion`, formatting options, and encryption-related options.
- Updated DiskPool manifests to `openebs.io/v1beta3` and changed example disk paths from unstable `/dev/sdb` names to stable `/dev/disk/by-id/...` paths, as recommended by OpenEBS.
- Split DiskPool resources into a dependent Flux Kustomization. DiskPools depend on CRDs/controllers installed by the OpenEBS HelmRelease, and Flux documents `dependsOn` for this CRD-before-custom-resource ordering case.
- Replaced `kubectl get msn` with a pod label query for Mayastor IO engine pods; the documented Mayastor node inspection path is via the OpenEBS/Mayastor kubectl plugin, which the post does not install.

## Review Notes
The YAML examples were parsed successfully after edits. Helm, kubectl, and flux binaries were not installed in the local environment, so CLI behavior was verified against official documentation and chart sources rather than local `--help` output.
