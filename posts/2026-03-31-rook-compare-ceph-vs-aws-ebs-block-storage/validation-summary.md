# Validation Summary: How to Compare Ceph vs AWS EBS for Block Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Rook (Ceph Kubernetes Operator)
- AWS EBS (Elastic Block Store) — gp3, io2
- Kubernetes StorageClass / CSI
- AWS CLI (ec2 snapshot commands)

## Sources Consulted
- AWS EBS SLA — https://aws.amazon.com/ebs/sla/ (contractual 99.99% availability)
- AWS EBS Volume Types — https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- AWS EBS gp3 limits increase (Sep 2025) — https://aws.amazon.com/about-aws/whats-new/2025/09/amazon-ebs-size-provisioned-performance-gp3-volumes/
- AWS EBS io2 Block Express — https://docs.aws.amazon.com/ebs/latest/userguide/provisioned-iops.html
- AWS EBS Pricing — https://aws.amazon.com/ebs/pricing/
- AWS EBS CSI Driver — https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- Rook Block Storage docs — https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook StorageClass example — https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Ceph RBD Snapshots — https://docs.ceph.com/en/reef/rbd/rbd-snapshot/

## Issues Found

### 1. AWS EBS Availability SLA overstated (line 21)
- **What was wrong:** The Architecture Comparison table listed "99.999% SLA (AWS)" for EBS availability. The contractual AWS EBS SLA guarantees 99.99% monthly uptime. The 99.999% figure refers to the design availability target, not the contractual SLA commitment.
- **Fix:** Changed "99.999% SLA (AWS)" to "99.99% SLA (AWS)".

### 2. EBS gp3 max IOPS outdated (line 63)
- **What was wrong:** Listed gp3 max IOPS as 16,000. In September 2025, AWS increased gp3 max IOPS to 80,000.
- **Fix:** Updated from 16,000 to 80,000.

### 3. EBS gp3 max throughput outdated (line 64)
- **What was wrong:** Listed gp3 max throughput as 1,000 MB/s. In September 2025, AWS increased gp3 max throughput to 2,000 MB/s.
- **Fix:** Updated from 1,000 MB/s to 2,000 MB/s.

### 4. EBS io2 max IOPS outdated (line 63)
- **What was wrong:** Listed io2 max IOPS as 64,000. Since April 2025, all io2 volumes are io2 Block Express, supporting up to 256,000 IOPS.
- **Fix:** Updated from 64,000 to 256,000.

## Review Notes
- The Ceph RBD multi-attach claim ("No, single RWO") is accurate for filesystem-mode PVCs, which is the typical Kubernetes use case. However, RBD does support ReadWriteMany (RWX) for raw block-mode volumes (`volumeMode: Block`). This is a reasonable simplification for the target audience.
- The Rook RBD StorageClass YAML omits CSI secret references (`csi.storage.k8s.io/provisioner-secret-name`, etc.) that are present in the official Rook example. This is acceptable for a comparison overview but readers may need to add these for a production deployment.
- The EBS volume types list (gp3, io2, st1, sc1) omits previous-generation types gp2 and io1, which are still available. This is a reasonable simplification since gp3 and io2 are the recommended current-generation types.
- The gp3 StorageClass YAML uses `iops: "3000"` and `throughput: "125"`, which are the baseline default values. These are correct but specifying them is technically redundant since gp3 provides these values by default.
