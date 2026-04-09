# Validation Summary: How to Deploy Rook-Ceph on Amazon EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Amazon EKS (Elastic Kubernetes Service)
- AWS EBS (Elastic Block Store)
- Helm
- Kubernetes CSI (Container Storage Interface)
- AWS CLI

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/
- Rook CephBlockPool CRD reference: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook StorageClass examples: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- AWS CLI ec2 reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/
- Other validated Rook deployment posts in this blog (k3s, Azure AKS, MicroK8s, OpenShift) for cross-referencing patterns

## Issues Found

1. **Missing CephBlockPool resource (critical)**: The StorageClass referenced `pool: replicapool`, but no CephBlockPool was ever created. Without this resource, Ceph has no pool to provision volumes from and PVC creation would fail. Added a CephBlockPool manifest with `failureDomain: host` and `replicated.size: 3` before the StorageClass step.

2. **Missing CSI secret parameters in StorageClass (critical)**: The StorageClass was missing all six required CSI secret parameters (`provisioner-secret-name`, `provisioner-secret-namespace`, `controller-expand-secret-name`, `controller-expand-secret-namespace`, `node-stage-secret-name`, `node-stage-secret-namespace`). Without these, the CSI driver cannot authenticate with Ceph and volume provisioning fails. Added all six parameters with the standard Rook secret names (`rook-csi-rbd-provisioner` and `rook-csi-rbd-node`).

3. **Missing toolbox deployment (moderate)**: Step 5 used `rook-ceph-tools` for verification commands but never deployed the toolbox. The Rook toolbox is a separate deployment that must be created explicitly. Added the toolbox deployment command before the verification commands.

4. **Outdated Ceph image version (minor)**: Updated `quay.io/ceph/ceph:v18.2.0` to `quay.io/ceph/ceph:v18.2.2` to align with other validated posts in this blog and include bug fixes and security patches from later Reef point releases.

## Review Notes
- On Nitro-based instances (like m5.xlarge recommended in the post), EBS volumes appear as NVMe devices (e.g., `/dev/nvme1n1`). The `--device /dev/xvdf` parameter in `aws ec2 attach-volume` is a suggested name, and Amazon Linux 2 AMIs create symlinks from `/dev/xvdf` to the actual NVMe path. The device name `xvdf` in the CephCluster manifest works via these symlinks, but users on custom AMIs or AL2023 should verify symlinks exist or use the actual NVMe device names instead.
- The WordPress test example (`wordpress.yaml`) also requires `mysql.yaml` for a fully functional deployment. As a PVC provisioning test it works fine, but the WordPress pod itself will not become healthy without MySQL.
- The post does not pin a specific Rook operator Helm chart version. In production, pinning to a specific version (e.g., `--version v1.14.0`) is recommended for reproducibility.
