# Validation Summary: How to Configure Key Rotation for Encrypted OSDs in Rook

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- LUKS (Linux Unified Key Setup) disk encryption
- Kubernetes CRDs, CronJobs
- HashiCorp Vault (KMS)

## Sources Consulted
- [Rook Key Management System Documentation](https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/)
- [Rook CephCluster CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- [Rook CRD Specification](https://rook.io/docs/rook/latest/CRDs/specification/)
- [Rook Key Encryption Key Rotation Design Document](https://git.digified.io/infrastructure/rook/-/blob/b6b89a012a95c55341a6a668680264eb41778bd6/design/ceph/key-encryption-key-rotation.md)
- [Rook Encryption Key Rotation Design (HackMD)](https://hackmd.io/@rakshith-r/S18NJjPEo)
- [Rook GitHub Issue #7925 - Implement encryption key rotation for cluster-wide (OSDs) encryption](https://github.com/rook/rook/issues/7925)
- [Rook GitHub source: key-management-system.md](https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/key-management-system.md)
- [Rook GitHub source: deploy/examples/cluster.yaml](https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml)

## Issues Found

### Issue 1: Fabricated annotation-based key rotation mechanism (Critical)
**What was wrong:** The post claimed key rotation is triggered via a `rook.io/force-osd-encryption-key-rotation` annotation on the CephCluster resource. This annotation does not exist in Rook. The Rook design document explicitly lists "On demand KEK rotation" as a non-goal.

**What was changed:** Replaced the entire annotation-based approach with the correct mechanism: key rotation is configured via `spec.security.keyRotation.enabled` and `spec.security.keyRotation.schedule` in the CephCluster CRD. Rook automatically creates per-OSD CronJobs when enabled.

### Issue 2: Incorrect key rotation process description
**What was wrong:** The 5-step process described was oversimplified and inaccurate. It stated "The old key is removed from the KMS" (step 4), when in reality the old key is removed from a LUKS key slot, and the new key is updated in the KMS.

**What was changed:** Replaced with the correct 6-step dual-slot LUKS rotation process: K1 is backed up to slot 1, K2 is generated and placed in slot 0, K2 is updated in the KMS, then K1 is removed from slot 1. Added explanation that this dual-slot approach ensures safety if the process is interrupted.

### Issue 3: Custom CronJob approach is wrong (Critical)
**What was wrong:** The post instructed users to create a custom Kubernetes CronJob that runs `kubectl annotate` to trigger key rotation. This is entirely incorrect — the annotation doesn't exist, and Rook creates its own CronJobs automatically (one per encrypted OSD) when `spec.security.keyRotation.enabled` is true.

**What was changed:** Replaced the custom CronJob section with documentation on how to customize the rotation schedule via the CephCluster spec, and how to verify the automatically-created CronJobs.

### Issue 4: Fabricated Prometheus metrics and alert rule
**What was wrong:** The Prometheus alert referenced `kube_cephcluster_annotations` and `kube_cephcluster_created` metrics, which do not exist. CephCluster is a custom resource, and kube-state-metrics does not expose these metrics by default. The alert logic was also flawed — it would fire for any cluster older than 1 hour with the annotation set, not specifically for stalled rotations.

**What was changed:** Removed the fabricated Prometheus alert entirely. Replaced with practical monitoring guidance: checking CronJob status, inspecting failed jobs, and verifying cluster health via the Ceph toolbox.

### Issue 5: Missing important limitations
**What was wrong:** The post did not mention that key rotation only works for PVC-backed encrypted OSDs, and only when KEKs are stored in Kubernetes Secrets or Vault KMS.

**What was changed:** Added a note in the Overview section documenting these limitations.

## Review Notes
- The CephX key rotation feature (configured at `spec.security.cephx`) is a separate, newer feature from OSD KEK rotation. The post correctly focuses only on OSD encryption key rotation, but readers should be aware these are distinct features.
- The example `cluster-on-pvc.yaml` in the Rook repository has a comment stating key rotation is "currently supported only for the default encryption type, using kubernetes secrets" — however, the KMS documentation page confirms Vault is also supported. The post (as corrected) aligns with the KMS documentation.
- The default rotation schedule is `@weekly`. Users should choose a schedule that balances security requirements against the operational overhead of key rotation.
