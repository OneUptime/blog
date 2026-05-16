# Validation Summary: How to Use Mayastor Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Talos Linux
- OpenEBS Replicated PV Mayastor
- Kubernetes
- Helm
- NVMe over Fabrics / NVMe TCP
- SPDK
- Kubernetes StorageClass, StatefulSet, and PersistentVolumeClaim resources

## Sources Consulted
- OpenEBS Replicated PV Mayastor prerequisites: https://openebs.io/docs/main/quickstart-guide/prerequisites
- OpenEBS installation documentation: https://openebs.io/docs/main/quickstart-guide/installation
- OpenEBS DiskPool documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-diskpool
- OpenEBS StorageClass documentation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-storageclass
- OpenEBS StorageClass parameters: https://openebs.io/docs/main/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-storage-class-parameters
- OpenEBS Mayastor Helm chart repository index: https://openebs.github.io/mayastor-extensions/index.yaml
- OpenEBS Mayastor Helm chart values: https://github.com/openebs/mayastor-extensions/blob/HEAD/chart/values.yaml
- Talos Linux storage guide for Mayastor/OpenEBS: https://www.talos.dev/v1.8/kubernetes-guides/configuration/storage/
- Talos Linux system extensions documentation: https://www.talos.dev/v1.9/talos-guides/configuration/system-extensions/

## Issues Found
- The prerequisites understated HugePages and overstated CPU requirements. Updated the HugePages requirement to 2GiB of 2MiB pages and the CPU requirement to 2 cores per I/O engine pod, matching OpenEBS Mayastor prerequisites.
- The Talos machine config mounted `/var/local/mayastor`, but the Mayastor chart uses paths under `/var/local/<release-name>`. Updated the kubelet bind mount to `/var/local` with `rbind`, matching Talos guidance.
- The Talos patch included `machine.install.extensions` for `iscsi-tools`. Mayastor uses NVMe-oF TCP, not iSCSI, and Talos documentation marks machine-config extension installation as deprecated. Removed that extension from this Mayastor-specific patch.
- The Helm values used `base.tag: v2.5.0`, which is not the current chart image tag setting. Updated it to `image.tag: release-2.10` and pinned the install command to chart version `2.10.0`.
- The Helm values used Kubernetes-style `hugepages-2Mi` keys, but the Mayastor chart values use `hugepages2Mi`. Updated both requests and limits.
- The etcd persistence storage class was set to `local-path`, which is not created by the Mayastor chart. Updated it to the chart's `mayastor-etcd-localpv` storage class.
- The values disabled `loki` but not the current chart's `alloy` logging component. Added `alloy.enabled: false` to match the intended observability disablement.
- DiskPool examples used `openebs.io/v1beta2`; current OpenEBS documentation uses `openebs.io/v1beta3`. Updated the DiskPool manifests.
- DiskPool examples used unstable `/dev/sdb` paths. Updated examples to use `/dev/disk/by-id/...` placeholders, which are more appropriate for persistent disk identity.
- StorageClass examples used `repl_count`, but current Mayastor StorageClass parameters use `repl`. Updated both StorageClasses.
- The PostgreSQL manifest created an unused standalone PVC in addition to the StatefulSet volume claim template. Removed the unused PVC.
- Commands checked Mayastor volumes with `kubectl get volumes`, but Mayastor volume inspection is exposed through the Mayastor kubectl plugin. Updated volume inspection commands to `kubectl mayastor get volumes`.
- Log and rollout commands referenced `deploy/agent-core`, but the Helm release creates `mayastor-agent-core` for the shown release name. Updated those commands.

## Review Notes
- The direct `openebs/mayastor` chart from `https://openebs.github.io/mayastor-extensions` remains available, but current OpenEBS documentation also documents installing the umbrella `openebs/openebs` chart from `https://openebs.github.io/openebs`.
- The Mayastor kubectl plugin is assumed for the `kubectl mayastor` inspection commands. A future improvement could add a short installation note for that plugin.
