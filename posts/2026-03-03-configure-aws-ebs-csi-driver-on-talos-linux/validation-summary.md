# Validation Summary: How to Configure AWS EBS CSI Driver on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux
- AWS EBS (Elastic Block Store)
- AWS EBS CSI Driver
- Kubernetes (CSI, StorageClass, PVC, VolumeSnapshot)
- Helm 3
- AWS IAM (node role and IRSA)
- kubectl / talosctl
- external-snapshotter (kubernetes-csi)

## Sources Consulted
- AWS EBS CSI Driver repo and docs: https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- Example IAM policy: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/example-iam-policy.json
- Helm chart: https://kubernetes-sigs.github.io/aws-ebs-csi-driver
- Kubernetes external-snapshotter: https://github.com/kubernetes-csi/external-snapshotter
- Kubernetes StorageClass docs (volumeBindingMode, WaitForFirstConsumer)
- AWS EBS gp3 baseline performance (3000 IOPS / 125 MB/s)

## Issues Found
1. **"Install the snapshot controller" section only installed CRDs.** The original commands under `## Volume Snapshots` applied only the three CRD manifests from `client/config/crd/` in the external-snapshotter repo. The CRDs and the snapshot controller deployment are separate components — without the controller, `VolumeSnapshot` objects would be created but never reconciled. Fixed by relabeling that block as "Install the snapshot CRDs" and adding a second block that applies `rbac-snapshot-controller.yaml` and `setup-snapshot-controller.yaml` from `deploy/kubernetes/snapshot-controller/`, matching the upstream installation guidance.

## Review Notes
- The IAM policy shown is a minimal working set for unencrypted volume operations. The upstream example policy (`docs/example-iam-policy.json`) is broader and includes tag-based conditions; users who want defense-in-depth should consider adopting it verbatim. Since the StorageClass sets `encrypted: "true"` with the default AWS-managed `aws/ebs` key (no custom CMK), no explicit KMS permissions are required on the node/role for the basic case. If users later switch to a customer-managed KMS key, they will need to add `kms:CreateGrant`, `kms:Decrypt`, `kms:DescribeKey`, `kms:GenerateDataKey*`, and `kms:ReEncrypt*` (and likely a key policy grant to the role). This is worth noting in a future update but is not strictly an error.
- The `5,000 volumes per region` figure is a commonly cited soft cap; AWS quotas are primarily expressed as total storage (e.g., 50 TiB for gp3) plus per-instance attachment limits. The post's framing is acceptable and the per-instance attachment caveat is correct.
- The Helm install command omits explicit IRSA on the node service account. For most deployments, only the controller SA needs the role ARN — current guidance is accurate.
- The `--watch` and `kubectl logs -l app=ebs-csi-controller -c ebs-plugin` selectors match the chart's current labels and container names.
- URLs reference the `master` branch of external-snapshotter; pinning to a `release-X.Y` branch would be more stable long-term but the `master` URLs resolve correctly today.
