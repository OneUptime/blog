# Validation Summary: How to Configure LUKS Encryption for Kubernetes Persistent Volumes at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, Secrets, and StatefulSets
- Container Storage Interface (CSI)
- Longhorn encrypted volumes
- LUKS, dm-crypt, cryptsetup, dmsetup, and lsblk
- HashiCorp Vault KV v2
- Go
- PostgreSQL container deployment
- fio benchmarking

## Sources Consulted
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes CSI external-provisioner documentation: https://kubernetes-csi.github.io/docs/external-provisioner.html
- Kubernetes CSI developer documentation: https://kubernetes-csi.github.io/docs/
- Longhorn volume encryption documentation: https://longhorn.io/docs/latest/advanced-resources/security/volume-encryption/
- cryptsetup manual page: https://man7.org/linux/man-pages/man8/cryptsetup.8.html
- cryptsetup luksFormat manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksFormat.8.html
- cryptsetup luksAddKey manual page: https://man.archlinux.org/man/core/cryptsetup/cryptsetup-luksAddKey.8.en
- cryptsetup luksRemoveKey manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksRemoveKey.8.html
- cryptsetup luksHeaderBackup manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksHeaderBackup.8.html
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2

## Issues Found
- The original StorageClass mixed TopoLVM fields with unsupported generic LUKS parameters. Replaced it with the documented Longhorn `driver.longhorn.io` provisioner, `encrypted: "true"`, and CSI Secret reference parameters.
- The Kubernetes Secret example used a generic `key` field and described a base64 value under `stringData`. Replaced it with Longhorn's documented `CRYPTO_KEY_*` fields and moved the example to the `longhorn-system` namespace.
- The key generation and Secret creation commands did not match the corrected Longhorn Secret format. Updated them to generate a text passphrase and populate the documented Secret keys.
- The manual `cryptsetup luksFormat` script placed options after positional arguments and was not safe for noninteractive execution. Reordered the command, added `--batch-mode`, and quoted shell variables.
- The custom CSI Go example was missing the `bytes` import and incorrectly placed node-local LUKS formatting/opening work in `CreateVolume`. Changed it to a node-side staging helper and added the missing import.
- The Vault Go example was missing the `fmt` import and read `secret.Data["key"]` directly even though KV v2 returns user data under `secret.Data["data"]`. Added nil checks and the correct nested data lookup.
- The key rotation script targeted `/dev/mapper/encrypted-volume` for LUKS header updates. Changed it to use the backing LUKS device, added `--new-key-slot 1`, quoted paths, and updated the Kubernetes Secret refresh command to use the corrected Longhorn Secret fields.

## Review Notes
The post is now technically consistent with Longhorn's documented encrypted volume workflow. Future improvements could mention that Kubernetes Secrets should also be protected with RBAC and etcd encryption at rest, but that is outside the scope of the correctness fixes.
