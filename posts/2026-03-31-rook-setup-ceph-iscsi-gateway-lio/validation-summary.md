# Validation Summary: How to Set Up Ceph iSCSI Gateway with LIO

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph iSCSI gateway (ceph-iscsi)
- LIO / targetcli (LinuxIO target stack)
- gwcli
- Ceph RBD

## Sources Consulted
- Ceph "Configuring the iSCSI Target using the Command Line Interface" — https://docs.ceph.com/en/latest/rbd/iscsi-target-cli/ (verified gwcli paths: `/iscsi-targets` is plural, `create <iqn>`, gateways `create <name> <ip>`, `/disks` `create pool=<p> image=<i> size=<s>`, hosts path and `create <initiator-iqn>`, and `auth username= password=`)
- Ceph "Configuring the iSCSI Target using the CLI - Manual Install" — https://docs.ceph.com/en/latest/rbd/iscsi-target-cli-manual-install/ (verified required components: tcmu-runner, rtslib-fb, configshell-fb, targetcli-fb, ceph-iscsi; services `rbd-target-gw` and `rbd-target-api`)
- ceph-iscsi `iscsi-gateway.cfg_sample` — https://raw.githubusercontent.com/ceph/ceph-iscsi/main/iscsi-gateway.cfg_sample (verified config keys: cluster_name, gateway_keyring, api_secure=false, api_user=admin, api_password=admin, api_port=5000, trusted_ip_list)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- The gwcli object hierarchy in the post (`/iscsi-targets` -> target IQN -> `gateways` -> `/disks` -> `hosts` -> `auth` -> `disk add`) matches the official CLI reference exactly, including the plural `/iscsi-targets` root.
- All `iscsi-gateway.cfg` `[config]` keys used in the post (cluster_name, gateway_keyring, api_secure, api_user, api_password, api_port, trusted_ip_list) are present in the upstream sample config with matching default values.
- `systemctl enable --now rbd-target-api rbd-target-gw` matches the documented service names. The manual-install docs additionally enable `tcmu-runner`; the post installs the package but relies on it as a dependency — acceptable for an overview and left as-is.
- `rbd create --size 100G iscsi-pool/disk1 --image-feature layering` is valid; ceph-iscsi-managed images use `layering` (the gateway manages additional features), so manually pre-creating with layering is consistent. Left as-is.
- The post installs the gateway via the `dnf` (RHEL/CentOS) package path, consistent with how ceph-iscsi is shipped; no version-specific command errors found.
