# Validation Summary: How to Implement NFS Subdir External Provisioner for Kubernetes PVC Automation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass dynamic provisioning
- NFS Subdir External Provisioner
- Helm
- Kubernetes RBAC, NetworkPolicy, and security contexts
- Prometheus Operator alerting

## Sources Consulted
- Kubernetes SIGs NFS Subdir External Provisioner README: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
- NFS Subdir External Provisioner Helm chart README: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/blob/master/charts/nfs-subdir-external-provisioner/README.md
- NFS Subdir External Provisioner Helm values: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/blob/master/charts/nfs-subdir-external-provisioner/values.yaml
- NFS Subdir External Provisioner deployment and RBAC manifests: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/tree/master/deploy
- NFS Subdir External Provisioner source code for path patterns and archive/delete behavior: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/blob/master/cmd/nfs-subdir-external-provisioner/provisioner.go
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- sig-storage-lib-external-provisioner metrics source: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/blob/master/vendor/sigs.k8s.io/sig-storage-lib-external-provisioner/v6/controller/metrics/metrics.go

## Issues Found
- The description claimed quota enforcement. NFS Subdir External Provisioner does not enforce per-PVC filesystem quotas, so the description and volume-size section were corrected.
- The examples used the old `k8s.gcr.io` image registry. The upstream project and chart now use `registry.k8s.io`, so Helm and manifest examples were updated.
- The manual deployment manifest omitted the matching StorageClass. Added a `StorageClass` using the same `provisioner` value as `PROVISIONER_NAME`.
- The path pattern example used `${.PVC.creationTimestamp}`, which is not supported by the provisioner. Replaced it with a supported label-based pattern.
- The archive example claimed timestamped archived directory names. The provisioner renames to `archived-<basePath>` without adding a timestamp, so the explanation and example path were corrected.
- The multi-server Helm commands set unsupported `env[...]` chart values for `PROVISIONER_NAME`. Updated them to use the chart-supported `storageClass.provisionerName`.
- The volume expansion section claimed Kubernetes resize support. The upstream project documents that resize/expansion is not supported, so the section now describes size-limit behavior instead.
- The monitoring example used a ServiceMonitor and metric name that are not exposed by the default deployment. Replaced it with alert rules based on Kubernetes workload and event metrics, with a caveat about required exporters.
- The troubleshooting NFS test attempted to mount NFS inside a BusyBox pod, which typically requires NFS client tooling and mount privileges. Replaced it with a TCP connectivity check to port 2049.
- The NetworkPolicy example selected arbitrary pods for Kubernetes API egress. Updated it to use an API server/service IP placeholder.
- The security-context example did not mention NFS permission requirements for non-root operation. Added a caveat that the export must allow that user to create and update directories.

## Review Notes
The provisioner project has not had a new container tag beyond `v4.0.2` in the upstream chart, while the chart release itself is newer. The chart's default `allowVolumeExpansion` value is `true`, but upstream provisioner documentation still states resize operations are not supported; the post now avoids recommending expansion.
