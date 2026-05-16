# Validation Summary: How to Install the iscsi-tools Extension on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0 referenced)
- Talos Image Factory (factory.talos.dev)
- `talosctl` CLI
- iSCSI / open-iscsi (iscsiadm, iscsid, initiatorname.iscsi, iscsid.conf)
- Linux kernel modules (iscsi_tcp, libiscsi, scsi_transport_iscsi, dm_multipath, dm_crypt)
- Kubernetes CSI drivers (Longhorn, OpenEBS, Democratic CSI)
- Helm
- CHAP authentication
- multipath-tools

## Sources Consulted
- Talos System Extensions docs — https://www.talos.dev/v1.7/talos-guides/configuration/system-extensions/
- Talos Boot Assets / Image Factory docs — https://www.talos.dev/v1.7/talos-guides/install/boot-assets/
- siderolabs/extensions catalog — https://github.com/siderolabs/extensions
- siderolabs/image-factory — https://github.com/siderolabs/image-factory
- Talos v1.7 config reference (`machine.install`, `machine.files`, `machine.kernel.modules`) — https://www.talos.dev/v1.7/reference/configuration/
- Talos deprecation of `install.extensions` — siderolabs/talos issue #9224
- open-iscsi project documentation for `iscsid.conf` keys (node.session.*, node.conn[0].timeo.*, CHAP)
- Longhorn install docs — https://longhorn.io/docs/ and https://charts.longhorn.io
- Talos Image Factory homepage — https://factory.talos.dev

## Issues Found
- **Method 2 used the deprecated `machine.install.extensions` field.** The example added `extensions: [{image: ghcr.io/siderolabs/iscsi-tools:v1.7.0}]` under `machine.install`. This field was deprecated in Talos v1.7.6 and became a no-op starting in v1.10 — system extensions on modern Talos are baked into the installer image produced by the Image Factory, not declared in machine config. Fixed by removing the `extensions:` list and rewording the section to clarify that the Factory-built installer image already contains the extension. Heading also updated to "Reference the Factory Installer in Machine Configuration" to better reflect what the snippet actually does.

## Review Notes
- The post pins examples to Talos v1.7.0. As of the validation date (2026-05-16), v1.7.x is well past EOL and the surrounding Talos ecosystem (Image Factory, extensions catalog, kernel module set) has moved forward. Readers should substitute the current Talos version when copying commands.
- `permissions: 0600` in the YAML example and `permissions: 384` (decimal equivalent) in the JSON patch are both technically correct. Some YAML 1.2 parsers prefer `0o600` notation, but Talos accepts the legacy `0600` form, so no change was needed.
- The `siderolabs/iscsi-tools` extension does ship `iscsid` as a Talos service and provides the listed kernel modules (`iscsi_tcp`, `libiscsi`, `scsi_transport_iscsi`), so the verification commands are accurate.
- The Image Factory API request body (`customization.systemExtensions.officialExtensions`) matches the current Image Factory schema.
- The `iscsid.conf` performance tuning keys (`node.session.timeo.replacement_timeout`, `node.conn[0].timeo.*`, `node.session.err_timeo.*`, `node.session.queue_depth`, `node.session.cmds_max`, `node.session.xmit_thread_priority`) are all valid open-iscsi configuration options.
- Longhorn's official preflight guidance recommends loading additional modules (e.g. `nfs`, `dm_crypt`, `iscsi_tcp`); the post covers the iSCSI-specific subset, which is sufficient for the scope of this guide.
