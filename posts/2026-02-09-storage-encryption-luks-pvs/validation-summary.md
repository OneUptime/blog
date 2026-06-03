# Validation Summary: How to Configure Storage Encryption at Rest with LUKS for Kubernetes PVs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes CSI drivers and StorageClasses
- LUKS / dm-crypt / cryptsetup
- Longhorn encrypted volumes
- HashiCorp Vault Kubernetes authentication
- PrometheusRule monitoring
- fio benchmarking

## Sources Consulted
- Kubernetes CSI node-driver-registrar documentation: https://kubernetes-csi.github.io/docs/node-driver-registrar.html
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes image registry migration notice: https://kubernetes.io/blog/2023/03/10/image-registry-redirect/
- Longhorn volume encryption documentation: https://longhorn.io/docs/latest/advanced-resources/security/volume-encryption/
- csi-driver-lvm documentation: https://github.com/metal-stack/csi-driver-lvm
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- cryptsetup luksFormat man page: https://man7.org/linux/man-pages/man8/cryptsetup-luksFormat.8.html
- cryptsetup luksAddKey man page: https://man7.org/linux/man-pages/man8/cryptsetup-luksAddKey.8.html
- cryptsetup luksRemoveKey man page: https://man7.org/linux/man-pages/man8/cryptsetup-luksRemoveKey.8.html

## Issues Found
- The CSI driver example used `local-volume-provisioner` as if it were a CSI node driver. Replaced it with a csi-driver-lvm installation example and an encrypted PVC example, because CSI drivers must expose CSI node services and register with kubelet.
- The original Kubernetes manifest defined a `ConfigMap` named `luks-keys` but mounted it as a `Secret`. Removed the inconsistent manifest while replacing the section with the csi-driver-lvm example.
- The Longhorn encrypted StorageClass only referenced node publish secrets. Added Longhorn's provisioner, node stage, and node expand secret parameters so provisioning, mounting, and online expansion have access to the encryption secret.
- The Longhorn secret creation omitted `CRYPTO_KEY_PROVIDER=secret`. Added it to match Longhorn's documented encrypted volume secret format.
- The Vault setup created a policy but did not bind it to the CSI driver's Kubernetes service account. Added the `auth/kubernetes/role/csi-driver` command.
- The Prometheus alert used `node_disk_info{device=~"dm-.*"} == 0`, which is not a reliable LUKS failure signal. Replaced it with a `node_filesystem_device_error` check for mapper devices.
- The `cryptsetup luksAddKey` example supplied only the new passphrase on stdin and did not provide the existing key non-interactively. Updated it to use `--key-file` for the current key and stdin for the new key.
- The StorageClass patch example implied that changing a CSI secret reference rotates existing LUKS headers. Replaced it with a note that CSI-managed rotation must follow the driver's documented process and that new StorageClasses only affect newly provisioned volumes.

## Review Notes
- The manual loop-device LUKS example is suitable for testing, but operators should use an unused loop device and clean up mounts and mappings after testing.
- csi-driver-lvm uses node-local storage and node-affine volumes; production deployments should account for backup, replication, and node loss.
- The claimed performance overhead of less than 5% can be true on modern AES-NI-capable systems, but it remains workload and hardware dependent.
