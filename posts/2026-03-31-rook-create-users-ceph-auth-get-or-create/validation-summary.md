# Validation Summary: How to Create Users with ceph auth get-or-create in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (authentication/authorization subsystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (Jobs, Secrets)
- CephFS (client capabilities)
- RBD (block device capabilities)

## Sources Consulted
- Ceph User Management documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph CephFS Client Auth documentation: https://docs.ceph.com/en/latest/cephfs/client-auth/
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
1. **Missing `restartPolicy` in Kubernetes Job YAML** — The Job spec in the "Rook Integration Pattern" section was missing `restartPolicy: Never`. Kubernetes Jobs require `restartPolicy` to be explicitly set to `Never` or `OnFailure`; the default value of `Always` is invalid for Jobs, and the API server rejects the manifest with a validation error. Added `restartPolicy: Never` to the pod template spec.

## Review Notes
- The Kubernetes Job example is intentionally simplified (missing Ceph config/keyring volume mounts and kubectl RBAC setup), which is acceptable for illustrating the `ceph auth get-or-create` pattern but would not work as-is in a real deployment without additional configuration.
- All Ceph command syntax, flags, capability strings, and behavioral descriptions were verified against official Ceph documentation and are accurate.
- The distinction between `get-or-create` (returns keyring format with name and key) and `get-or-create-key` (returns raw key only) is correctly described.
- The idempotency behavior description is accurate: the command creates if not exists, returns existing keyring if it does.
