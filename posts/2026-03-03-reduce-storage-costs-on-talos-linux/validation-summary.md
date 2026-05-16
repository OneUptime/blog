# Validation Summary: How to Reduce Storage Costs on Talos Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (machine config, kubelet extraArgs)
- Kubernetes (PersistentVolumes, PersistentVolumeClaims, StorageClasses, CronJobs, Deployments, init containers)
- AWS EBS CSI driver (gp3, sc1, io2 volume types)
- CSI Volume Snapshots (`snapshot.storage.k8s.io/v1`)
- kubectl and jq for cluster auditing
- Bash scripting (process substitution, `comm`, `find`)
- Distroless container images

## Sources Consulted
- Talos Linux v1.7 machine config reference — https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos kubelet_spec.go (forbidden extraArgs list) — https://github.com/siderolabs/talos/blob/v1.7.6/internal/app/machined/pkg/controllers/k8s/kubelet_spec.go
- Talos kubelet.go (protected extraConfig fields) — https://github.com/siderolabs/talos/blob/v1.7.6/pkg/machinery/kubelet/kubelet.go
- Kubelet CLI flag reference — https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- KubeletConfiguration v1beta1 reference — https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- AWS EBS CSI driver parameters — https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- Kubernetes Storage Classes — https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Volume Snapshots — https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
- **Misleading comment in audit section**: The second jq snippet was preceded by the comment `# Find PVCs that are not bound to any pod`, but the `select(.status.phase == "Bound")` filter actually lists PVCs bound to a PV (PVC "Bound" phase is unrelated to pod attachment). Updated the comment to `# List all bound PVCs with their size and storage class` to accurately describe the code's behavior.

## Review Notes
- The Talos kubelet `extraArgs` example (`image-gc-high-threshold`, `image-gc-low-threshold`, `minimum-image-ttl-duration`) is valid — none of these flags are in Talos's forbidden extraArgs list, and they still function in current kubelet versions. However, these CLI flags are marked DEPRECATED upstream in favor of the equivalent `KubeletConfiguration` fields (`imageGCHighThresholdPercent`, `imageGCLowThresholdPercent`, `imageMinimumGCAge`), which can be set via `machine.kubelet.extraConfig` in Talos. A future revision could switch to that idiom, but the existing snippet is correct and functional.
- AWS EBS CSI driver provisioner (`ebs.csi.aws.com`), volume types (`gp3`, `sc1`, `io2`), and parameters (`iops`, `throughput`) are all valid. gp3 defaults of 3000 IOPS / 125 MiB/s match the documented driver defaults.
- API versions `storage.k8s.io/v1` (StorageClass) and `snapshot.storage.k8s.io/v1` (VolumeSnapshot, GA since k8s 1.20) are current.
- The `storageclass.kubernetes.io/is-default-class` annotation and the kubectl patch syntax to toggle it are correct.
- The `comm -23` pattern with bash process substitution for finding orphaned PVCs works as intended.
- The `kubectl patch pvc` volume expansion command is correct; it requires the StorageClass to have `allowVolumeExpansion: true` (which the example StorageClasses do).
