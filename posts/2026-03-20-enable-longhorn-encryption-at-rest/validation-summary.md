# Validation Summary: How to Enable Longhorn Volume Encryption at Rest

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes StorageClass, PersistentVolumeClaim, Pod, and Secret resources
- CSI StorageClass secret parameters
- LUKS2 / dm-crypt / cryptsetup
- External Secrets Operator
- HashiCorp Vault

## Sources Consulted
- Longhorn Volume Encryption: https://longhorn.io/docs/latest/advanced-resources/security/volume-encryption/
- Longhorn Installation Requirements: https://longhorn.io/docs/latest/deploy/install/
- Longhorn Volume Expansion: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/expansion/
- Longhorn Trim Filesystem: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/trim-filesystem/
- Kubernetes: Change the default StorageClass: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes CSI Developer Docs, StorageClass Secrets: https://kubernetes-csi.github.io/docs/secrets-and-credentials-storage-class.html
- External Secrets Operator, HashiCorp Vault provider: https://external-secrets.io/v2.0.0/provider/hashicorp-vault/
- External Secrets Operator templating guide: https://external-secrets.io/main/guides/templating/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- `cryptsetup-status(8)` manual: https://www.man7.org/linux/man-pages/man8/cryptsetup-status.8.html

## Issues Found
1. **Non-portable prerequisite instructions**: The post treated `/etc/modules` as a universal way to persist `dm_crypt` across reboots. That is distro-specific, so I removed those commands and replaced them with a generic note to use the Linux distribution's supported persistence mechanism.

2. **Incorrect Longhorn secret keys**: The secret used unsupported `CRYPTO_LUKS_*` fields. Longhorn's documented encryption secret parameters are `CRYPTO_KEY_VALUE`, `CRYPTO_KEY_PROVIDER`, `CRYPTO_KEY_CIPHER`, `CRYPTO_KEY_HASH`, `CRYPTO_KEY_SIZE`, and `CRYPTO_PBKDF`, so I replaced the invalid fields with the supported ones.

3. **Incomplete encrypted StorageClass example**: The StorageClass omitted `csi.storage.k8s.io/node-expand-secret-name` and `csi.storage.k8s.io/node-expand-secret-namespace`, which Longhorn documents for encrypted volume expansion. I added both fields.

4. **Overly specific default StorageClass patch command**: The post assumed the existing default class was always named `longhorn`. I changed the command to use a placeholder for the actual current default StorageClass name so the instructions match Kubernetes behavior across clusters.

5. **Race condition in the validation workflow**: The post tried to `kubectl exec` into the test pod immediately after `kubectl apply`. I added `kubectl wait --for=condition=Ready` so the command sequence works reliably.

6. **Incorrect or unreliable encryption verification commands**: The post filtered `/dev/mapper` with `grep longhorn`, which is not a reliable way to identify the mapped encrypted device, and used `cryptsetup status` with a `/dev/mapper/...` path even though the command is documented against the mapping name. I changed the instructions to list mapped devices and run `cryptsetup status <volume-name>`. I also clarified that the `dd` check reads the underlying Longhorn block device, not an "unencrypted" device.

7. **Incorrect Vault integration model**: The post implied Longhorn could switch `CRYPTO_KEY_PROVIDER` to `aws` or `vault`. Longhorn's documented integration is still through Kubernetes Secrets. I corrected the section so Vault populates the Kubernetes Secret Longhorn reads, and updated the External Secrets example to the current `external-secrets.io/v1` API with templating for the final Secret shape.

## Review Notes
- Existing Longhorn volumes are not retroactively encrypted when you switch the default StorageClass. The default encrypted StorageClass affects newly provisioned volumes.
- Longhorn also documents `longhornctl check preflight` as a supported way to validate node prerequisites, but the post's manual checks are technically valid after the corrections above.
