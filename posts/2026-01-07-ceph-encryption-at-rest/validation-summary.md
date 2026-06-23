# Validation Summary: How to Configure Ceph Encryption at Rest

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ceph OSD encryption with dm-crypt/LUKS
- ceph-volume and cephadm OSD deployment
- HashiCorp Vault Transit and KV secrets engines
- Ceph RGW SSE-KMS with Vault
- RBD image encryption
- Ceph CSI encrypted Kubernetes volumes
- CephFS fscrypt
- Linux dm-crypt, LUKS, fscrypt, and FIPS-mode considerations

## Sources Consulted
- Ceph ceph-volume LVM encryption documentation: https://docs.ceph.com/en/latest/ceph-volume/lvm/encryption/
- Ceph cephadm OSD service documentation: https://docs.ceph.com/en/latest/cephadm/services/osd/
- Ceph RBD image encryption documentation: https://docs.ceph.com/en/latest/rbd/rbd-encryption/
- Ceph CephFS fscrypt documentation: https://docs.ceph.com/en/latest/cephfs/fscrypt/
- Ceph RGW HashiCorp Vault integration documentation: https://docs.ceph.com/en/latest/radosgw/vault/
- Ceph CSI Vault KMS examples: https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/kms-config.yaml
- HashiCorp Vault Transit secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/transit
- HashiCorp Vault AppRole documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault Agent file sink documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/sinks/file
- Linux kernel fscrypt documentation: https://docs.kernel.org/filesystems/fscrypt.html

## Issues Found
- The post implied Vault directly manages Ceph OSD dm-crypt keys. Updated the architecture, key-management flow, prerequisites, Vault section, troubleshooting, and conclusion to reflect that ceph-volume stores dm-crypt keys through Ceph monitor config-key workflow; Vault support applies to RGW SSE-KMS and Ceph CSI workflows.
- The dm-crypt configuration snippet used old ceph-disk-style settings as if they enabled modern OSD encryption. Replaced it with ceph-volume/cephadm guidance using `--dmcrypt` and `encrypted: true`.
- The RBD mapping example used the default kernel RBD mapper for encrypted images. Updated it to use `rbd device map -t nbd -o encryption-passphrase-file=...`, because Ceph documents that `krbd` does not support RBD image encryption.
- The RBD encryption commands used a non-documented `--encryption-passphrase-file` form for `rbd encryption format`. Updated examples to use the documented positional passphrase file argument.
- The CephFS section included `allow_new_snaps` and `test_dummy_encryption`, which do not enable CephFS fscrypt. Replaced them with client-side fscrypt setup and a standard CephFS mount example.
- The Ceph CSI Vault KMS example used an incorrect KV v2 path shape and an unsupported CA field. Updated it to match the upstream Ceph CSI Vault KMS example keys.
- The Vault RGW configuration used underscored option names and described RGW/RBD key management together. Updated it to RGW SSE-KMS scope and Ceph's documented `rgw crypt vault ...` options.
- The FIPS section overstated Ceph-specific dm-crypt cipher configuration. Updated it to focus on OS-level FIPS mode, validated crypto packages, and Ceph messenger secure mode.
- The Vault installation example pinned an outdated Vault version. Updated the example to the current supported Vault release checked during review.

## Review Notes
The performance numbers are presented as illustrative estimates, not guaranteed benchmarks. Real overhead depends heavily on CPU AES acceleration, media type, object size, workload shape, and whether encryption is OSD-level, RBD client-side, or messenger encryption.
