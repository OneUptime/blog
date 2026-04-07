# Validation Summary: How to Rotate Encryption Keys for Ceph OSDs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph OSD encryption
- LUKS2 (Linux Unified Key Setup)
- cryptsetup CLI
- Kubernetes Secrets
- HashiCorp Vault KV v2
- kubectl CLI

## Sources Consulted
- cryptsetup man page and LUKS2 specification (https://gitlab.com/cryptsetup/cryptsetup/-/wikis/LUKS2-On-Disk-Format)
- Rook documentation on OSD encryption (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/)
- Rook source code for encryption key secret naming conventions
- cryptsetup luksDump output format differences between LUKS1 and LUKS2

## Issues Found

1. **Newline inconsistency in key handling**: The post used `echo "$KEY"` (which appends a trailing newline) when passing keys to `cryptsetup`, but `echo -n $NEW_KEY` (no trailing newline) when base64-encoding for the Kubernetes secret. This mismatch would cause the passphrase stored in LUKS to differ from what Rook reads from the secret, breaking OSD unlock on restart. Fixed all key-passing commands to use `printf '%s'` consistently to avoid trailing newlines.

2. **LUKS2 verification command used LUKS1 output format**: The post claimed LUKS2 but used `grep "Key Slot"` and described output as "ENABLED"/"DISABLED", which is the LUKS1 `luksDump` format. LUKS2 displays keyslots in a `Keyslots:` section with different formatting. Updated the verification step to reflect LUKS2 output.

3. **Vault section was dangerously incorrect**: The original text suggested updating the Vault secret and then simply restarting the OSD pod. This would cause the OSD to fail because the new Vault key would not match the old LUKS passphrase on the device. Fixed to clarify that the LUKS header must be updated first (Steps 2-4), and then the Vault secret updated to match. Added a warning about the failure mode.

## Review Notes
- The LUKS2 claim of "up to 32 key slots" is correct per the LUKS2 on-disk format specification.
- The OSD re-provisioning approach is valid and is indeed the safest method for Rook-managed clusters, though the post could note that this requires replication factor >= 2 to avoid data loss.
- The Rook encryption key secret naming pattern `rook-ceph-osd-encryption-key-osd-{N}` matches Rook's conventions.
