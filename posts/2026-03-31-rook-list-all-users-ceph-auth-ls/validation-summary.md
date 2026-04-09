# Validation Summary: How to List All Users with ceph auth ls

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (authentication subsystem, `ceph auth` commands)
- Rook (Ceph operator for Kubernetes, toolbox pod, CSI driver users)
- Kubernetes (`kubectl exec` for toolbox access)
- jq (JSON filtering)

## Sources Consulted
- Ceph official documentation on user management and `ceph auth` commands: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Rook CSI driver documentation for default user naming conventions

## Issues Found
- **Incorrect grep pattern for identifying Rook-created users**: The command `grep rook` was used to filter Rook-created entities, but four of the five listed users (`client.csi-cephfs-node`, `client.csi-cephfs-provisioner`, `client.csi-rbd-node`, `client.csi-rbd-provisioner`) contain "csi" rather than "rook" in their names. Only `client.rook-ceph-crash` would be matched by `grep rook`. Fixed the grep to `grep -E "rook|csi"` so it correctly matches all listed Rook-created users.

## Review Notes
- The claim that `ceph auth get` supports keyring format export while `ceph auth ls` does not is correct: `ceph auth get` outputs in keyring-compatible format (bracketed entity headers), while `ceph auth ls` uses a different listing format.
- The list of Rook-created CSI users reflects default naming for recent Rook versions. Some deployments may use a cluster-specific prefix (e.g., `client.rook-csi-rbd-node-<namespace>`) depending on Rook configuration, but the names shown are the common defaults.
- The `--format json-pretty` and `--format json` flags are both valid Ceph output format options.
- The JSON structure using `auth_dump` as the top-level key is correct for `ceph auth ls` JSON output.
