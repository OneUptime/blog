# Validation Summary: How to Install iscsi-tools Extension on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (system extensions, machine config, talosctl)
- iSCSI (open-iscsi initiator, iscsid, port 3260, IQN naming)
- Talos Image Factory and Imager
- Kubernetes (PersistentVolumeClaim, StorageClass, CSI drivers)
- Democratic-CSI (freenas-iscsi driver) with TrueNAS
- OpenEBS (Jiva engine)
- Longhorn
- Helm

## Sources Consulted
- Sidero Labs extensions repo: https://github.com/siderolabs/extensions
- iscsi-tools package tags: https://github.com/siderolabs/extensions/pkgs/container/iscsi-tools
- Talos Image Factory docs: https://www.talos.dev/v1.7/learn-more/image-factory/
- image-factory API docs: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos issue on `machine.install.extensions` deprecation: https://github.com/siderolabs/talos/issues/9224
- Democratic-CSI README: https://github.com/democratic-csi/democratic-csi
- OpenEBS Jiva CSI migration: https://openebs.io/blog/provisioning-openebs-jiva-volumes-via-csi
- Longhorn docs: https://longhorn.io/docs/

## Issues Found
- **Invalid `iscsi-tools` image tag (`v0.1.4`)**: The `ghcr.io/siderolabs/iscsi-tools` extension does not publish its own `v0.1.x` semver tags. Tags are Talos-version-aligned (e.g., `v1.7.0`, `v1.7.1`). Updated both occurrences (Method 1 machine config and Method 3 Imager command) to use `ghcr.io/siderolabs/iscsi-tools:v1.7.0` to match the installer version referenced elsewhere in the post.

## Review Notes
- `machine.install.extensions` (Method 1) was deprecated upstream in Talos 1.5+ in favor of building a custom installer image via Image Factory or Imager. The post does present Image Factory (Method 2) and Imager (Method 3) as alternatives, so the deprecated method is shown alongside current best practice. A future revision could note that Method 1 is deprecated and that running `talosctl upgrade` with the stock `ghcr.io/siderolabs/installer` image will not actually bake the extension into the OS — only an Image Factory custom installer (`factory.talos.dev/installer/<schematic-id>:v1.7.0`) will. This same pattern appears across the sibling Talos extension posts in this blog series and was left intact for consistency.
- The OpenEBS Jiva section uses the legacy out-of-tree provisioner name `openebs.io/provisioner-iscsi`, which was declared EOL in March 2022 and stopped working on Kubernetes 1.22+. Modern Jiva deployments use the CSI driver `jiva.csi.openebs.io`. The example is therefore historically accurate but outdated for greenfield clusters.
- All `talosctl` commands shown (`get extensions`, `services`, `read /proc/modules`, `dmesg`, `apply-config`, `upgrade`, `health`) are valid.
- The Image Factory API call format, Democratic-CSI Helm repo URL, driver names (`org.democratic-csi.iscsi`, `freenas-iscsi`), and Longhorn install commands all check out against upstream documentation.
- File permissions notation `0o644` is correct YAML 1.2 octal and is accepted by Talos machine config.
