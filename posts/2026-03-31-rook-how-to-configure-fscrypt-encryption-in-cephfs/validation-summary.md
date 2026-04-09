# Validation Summary: How to Configure fscrypt Encryption in CephFS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Quincy 17.2+)
- CephFS (fscrypt client-side encryption)
- Rook Ceph Operator
- fscryptctl (low-level fscrypt CLI from google/fscryptctl)
- fscrypt (high-level fscrypt CLI from google/fscrypt)
- Linux kernel fscrypt framework

## Sources Consulted
- Official Ceph documentation on CephFS fscrypt: https://docs.ceph.com/en/latest/cephfs/fscrypt/
- fscryptctl GitHub repository and man page: https://github.com/google/fscryptctl
- fscrypt (high-level tool) GitHub repository: https://github.com/google/fscrypt
- Linux kernel fscrypt documentation: Documentation/filesystems/fscrypt.rst
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Phoronix reporting on CephFS fscrypt merge in Linux 6.6

## Issues Found

1. **Incorrect kernel version requirement**: Post stated "Linux kernel 5.4 or later (for fscrypt v2 API)". While kernel 5.4 introduced fscrypt v2 for ext4/f2fs, CephFS fscrypt support was only completed in Linux kernel 6.6 (September 2023). Changed to "Linux kernel 6.6 or later".

2. **`fscryptctl setup` does not exist**: Step 3 used `fscryptctl setup /mnt/cephfs` but `fscryptctl` has no `setup` command. The `setup` command belongs to the higher-level `fscrypt` tool. Changed to `fscrypt setup /mnt/cephfs` with a clarifying comment.

3. **Key format error in Step 4**: The post generated a base64-encoded key and piped it to `fscryptctl add_key`, but `fscryptctl add_key` expects raw binary key data on stdin (per the man page: "must be given in raw binary"). Changed to generate and store a raw binary key file.

4. **`fscryptctl remove_key` incorrect syntax in Step 6**: The post used `fscryptctl remove_key /mnt/cephfs < /secure/location/mykey.b64` (piping key data via stdin). The correct syntax is `fscryptctl remove_key KEY_IDENTIFIER MOUNTPOINT` where the key identifier is a positional argument. Fixed to `fscryptctl remove_key $key_identifier /mnt/cephfs`.

5. **Incorrect filename encryption mode name**: Post used "AES-256-CTS-CBC" in the `fscryptctl set_policy` command, but `fscryptctl` accepts "AES-256-CTS" (per fscryptctl v1.3.0 documentation). Changed to "AES-256-CTS".

6. **False claim that ceph-fuse does not support fscrypt**: The Limitations section stated "Kernel client only (no fscrypt support in ceph-fuse)". The official Ceph documentation explicitly states that ceph-fuse and libcephfs both support fscrypt, with the limitation that only AES-256-XTS (contents) and AES-256-CTS (filenames) ciphers are available. Updated the limitations and prerequisites accordingly.

7. **Fabricated `ceph fs set myfs fscrypt true` command**: The post instructed readers to run this command to enable fscrypt server-side. However, this flag does not appear in the Ceph source code (FSCommands.cc, MDSMap.h/cc) or official documentation. The Ceph docs explicitly state: "Encryption happens completely on the client side. The MDS and OSD are not aware of encryption policies or master keys." Replaced Step 1 with a prerequisites verification step and updated the Rook section to use `ceph fs status` instead.

8. **Variable naming**: Changed `key_descriptor` to `key_identifier` to match fscrypt v2 API terminology (v2 uses "key identifiers", v1 used "key descriptors").

## Review Notes
- The fscrypt feature in CephFS is still described as relatively new. The official Ceph docs note that the userspace implementation (for ceph-fuse) is not yet packaged into a formal release and may require building from a custom branch (https://github.com/ceph/fscrypt/tree/wip-ceph-fuse).
- The Rook CephFilesystem CRD has no native fscrypt field. For CSI-level encryption, configuration is done through StorageClass parameters and the `rook-ceph-csi-kms-config` ConfigMap, which is a different mechanism than the client-side fscrypt described in this post.
- The `secretfile` mount option in Step 2 points to `/etc/ceph/admin.keyring` which is typically a Ceph keyring file (with `[client.admin]` header). The `secretfile` option technically expects a file containing only the base64-encoded secret key. The mount.ceph helper may handle keyring files, but this could be clearer.
