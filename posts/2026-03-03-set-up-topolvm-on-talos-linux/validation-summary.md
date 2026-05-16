# Validation Summary: How to Set Up TopoLVM on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- TopoLVM
- Kubernetes
- Helm
- LVM / LVM2
- CSI storage
- cert-manager

## Sources Consulted
- Talos Linux System Extensions documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/custom-images-and-development/system-extensions
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs system extensions repository: https://github.com/siderolabs/extensions
- TopoLVM Getting Started guide: https://github.com/topolvm/topolvm/blob/main/docs/getting-started.md
- TopoLVM Advanced Setup guide: https://github.com/topolvm/topolvm/blob/main/docs/advanced-setup.md
- TopoLVM Helm chart values: https://github.com/topolvm/topolvm/blob/main/charts/topolvm/values.yaml
- TopoLVM scheduler documentation: https://github.com/topolvm/topolvm/blob/main/docs/topolvm-scheduler.md
- TopoLVM controller documentation: https://github.com/topolvm/topolvm/blob/main/docs/topolvm-controller.md
- TopoLVM LogicalVolume CRD documentation: https://github.com/topolvm/topolvm/blob/main/docs/logical-volume-crd.md
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes CSI storage capacity documentation: https://kubernetes.io/docs/concepts/storage/storage-capacity/

## Issues Found
- The Talos system extension instructions used the deprecated `.machine.install.extensions` flow and pinned an old extension image. Updated the post to use a Talos Image Factory installer containing the `siderolabs/lvm2` extension, and noted that workers must be upgraded into that installer image.
- The running-node Talos patch command used `talosctl patch machineconfig`; updated it to the documented `talosctl patch mc` form.
- The TopoLVM Helm values placed `lvmd` and resources under incorrect keys. Updated examples to use top-level `lvmd` and the chart's top-level `resources` map.
- The post enabled `scheduler.enabled` without the required kube-scheduler extender configuration and used an invalid webhook values key. Updated the default path to use Kubernetes Storage Capacity Tracking, which the TopoLVM chart enables by default, and set the pod mutating webhook consistently with that mode.
- The post omitted the chart's cert-manager dependency. Added cert-manager as a prerequisite and included the CRD installation step when installing cert-manager with the chart.
- The capacity verification commands read nonexistent node status capacity fields. Replaced them with `kubectl get csistoragecapacities -A`.
- The LVM verification commands exec'd into the wrong TopoLVM DaemonSet/container. Replaced them with `LogicalVolume` CRD checks and clarified that direct `vgs` checks need a privileged helper pod or node maintenance workflow.
- The StatefulSet example referenced a `cache` namespace without creating it. Added a Namespace manifest to the example.
- The multiple device class and thin provisioning snippets used the same incorrect nested `node.lvmd` values path. Updated them to top-level `lvmd`.
- The TopoLVM log commands did not specify containers for multi-container pods. Added explicit `-c topolvm-controller` and `-c topolvm-node`.
- The thin provisioning section omitted that the LVM thin pool must exist before TopoLVM uses it. Added that prerequisite note.

## Review Notes
The guide now follows the current TopoLVM chart's default Storage Capacity Tracking path. Using `topolvm-scheduler` is still possible, but it requires disabling storage capacity tracking, enabling the pod mutating webhook, and configuring kube-scheduler with the extender.
