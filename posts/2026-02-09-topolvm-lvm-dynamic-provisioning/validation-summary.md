# Validation Summary: How to Use TopoLVM for LVM-Based Dynamic Provisioning in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- TopoLVM
- CSI storage
- LVM
- Helm
- Kubernetes StorageClass, PVC, StatefulSet, and VolumeSnapshot APIs

## Sources Consulted
- TopoLVM Getting Started: https://github.com/topolvm/topolvm/blob/main/docs/getting-started.md
- TopoLVM Helm chart README and values: https://github.com/topolvm/topolvm/tree/main/charts/topolvm
- TopoLVM snapshot and restore documentation: https://github.com/topolvm/topolvm/blob/main/docs/snapshot-and-restore.md
- TopoLVM limitations: https://github.com/topolvm/topolvm/blob/main/docs/limitations.md
- TopoLVM controller documentation: https://github.com/topolvm/topolvm/blob/main/docs/topolvm-controller.md
- TopoLVM scheduler documentation: https://github.com/topolvm/topolvm/blob/main/docs/topolvm-scheduler.md
- TopoLVM constants source for current plugin name and keys: https://github.com/topolvm/topolvm/blob/main/constants.go
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The post used legacy `topolvm.cybozu.com` provisioner and parameter keys. Updated examples to the current default `topolvm.io` domain.
- The install section referenced a non-authoritative `releases/latest/download/manifests.yaml` flow. Replaced it with the documented Helm chart flow and a `helm template --include-crds | kubectl apply -f -` flow.
- The Helm install omitted the cert-manager handling documented by TopoLVM. Added the cert-manager CRD step and `cert-manager.enabled=true` for the chart-managed cert-manager path.
- The expected pod list described `topolvm-scheduler` as a webhook and expected one controller replica. Updated the expected components to match the chart defaults more closely.
- The thin-provisioning example used an invalid direct `lvcreate-options` StorageClass parameter. Updated it to use a `thin` device class and noted that it requires an lvmd thin device class backed by a pre-created thin pool.
- The snapshot section implied snapshots work with a normal thick volume. Updated the text and examples to use a thin-provisioned PVC, because TopoLVM snapshots are documented as thin-volume only.
- Snapshot restore used `dataSource`; updated to `dataSourceRef` to match TopoLVM's current snapshot restore example.
- The monitoring example looked for TopoLVM capacity in node status resources using the legacy resource name. Updated it to read the current `capacity.topolvm.io/<device-class>` node annotation.
- The scheduling section stated each StatefulSet replica is scheduled on a different node. Changed this to say pods are placed on nodes with available storage capacity, because unique node placement is not guaranteed by TopoLVM alone.
- The troubleshooting section directed users to scheduler logs even though the default chart leaves the scheduler disabled. Updated the example to inspect controller logs.

## Review Notes
The examples assume matching lvmd device classes exist for `ssd`, `nvme`, `hdd`, and `thin`; the post now calls out the thin-pool requirement, but a production guide should include a complete values.yaml for all custom device classes.
