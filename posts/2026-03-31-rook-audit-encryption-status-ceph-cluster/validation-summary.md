# Validation Summary: How to Audit Encryption Status Across a Ceph Cluster

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- LUKS / dm-crypt (Linux disk encryption)
- kubectl (Kubernetes CLI)
- cryptsetup (LUKS management tool)
- HashiCorp Vault (KMS integration)

## Sources Consulted
- Rook official documentation on OSD encryption: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/#encryption
- Kubernetes documentation on `kubectl debug node/`: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Rook CephCluster CRD spec for `storage.config.encryptedDevice`
- Rook source code for OSD encryption key secret naming conventions
- cryptsetup man page for `cryptsetup status` output format
- HashiCorp Vault CLI documentation for `vault audit list`

## Issues Found

1. **Step 3 — `kubectl debug node/` path error**: The command used `ls /dev/mapper/` directly inside the debug container, but `kubectl debug node/` mounts the host filesystem at `/host`. Without `chroot /host`, the command inspects the container's own `/dev/mapper/`, not the host's. Fixed by adding `chroot /host` before `ls /dev/mapper/`.

2. **Step 3 — incorrect grep pattern**: The command grepped for `"ceph"` in `/dev/mapper/` names, but Rook dm-crypt device mapper entries do not contain "ceph" in their names. They use patterns like `<set-name>-<index>-<uuid>-block-dmcrypt`. Changed `grep ceph` to `grep dmcrypt` which reliably matches all Rook-encrypted OSD devices.

3. **Step 4 — incorrect glob pattern for dm-crypt devices**: The glob `*ceph*block*dmcrypt*` would not match actual Rook dm-crypt device names (which don't contain "ceph"). Changed to `*dmcrypt*` to correctly match Rook's dm-crypt mapped device names.

4. **Step 5 — bare `ceph osd stat` command**: The `ceph` CLI was invoked directly without running it inside the Rook toolbox pod. Other commands in the post correctly use `kubectl` to interact with the cluster, but this one assumed the ceph CLI was locally installed and configured. Fixed to `kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd stat`. Also replaced `grep -oP '\d+ osds'` (which returned "3 osds" instead of just "3") with `awk '{print $1}'` for a clean numeric value.

5. **Step 6 — incorrect encryption key secret naming**: The script constructed secret names as `rook-ceph-osd-encryption-key-osd-${osd_id}`, but Rook does not name encryption key secrets by OSD ID. Secrets are named based on the PVC claim name (for PVC-backed OSDs) or device identifier (for raw devices). Replaced the secret name lookup with a direct dm-crypt device check inside each OSD pod (`ls /dev/mapper/*dmcrypt*`), which is more reliable regardless of deployment type. Added a key secret count summary at the end.

## Review Notes
- The `spec.storage.config.encryptedDevice` jsonpath (Step 1) is correct for raw-device OSD deployments. For PVC-based StorageClassDeviceSets, encryption is configured at `spec.storage.storageClassDeviceSets[].encrypted` instead. The post could mention both paths, but this is an enhancement rather than an error.
- The Vault audit section (Step 7) uses `/var/log/vault/audit.log` as the log path and `rook/osd` as the KMS path prefix — both are deployment-specific and may vary. The post correctly frames this section as conditional ("if using Vault").
- The `cryptsetup status` expected output showing LUKS2, aes-xts-plain64 cipher, and 512-bit keysize is accurate for Rook's default encryption configuration.
