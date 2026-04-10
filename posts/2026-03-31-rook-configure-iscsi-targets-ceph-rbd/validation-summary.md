# Validation Summary: How to Configure iSCSI Targets for Ceph RBD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RBD block storage)
- ceph-iscsi (iSCSI gateway for Ceph)
- gwcli (ceph-iscsi CLI tool)
- iSCSI (protocol and target/initiator concepts)
- open-iscsi (iscsiadm initiator tools)
- targetcli (LIO target inspection)
- Rook (Ceph orchestration on Kubernetes)

## Sources Consulted
- Ceph official documentation on iSCSI gateway configuration: https://docs.ceph.com/en/latest/rbd/iscsi-overview/
- Ceph iSCSI gateway CLI (gwcli) usage: https://docs.ceph.com/en/latest/rbd/iscsi-target-cli/
- ceph-iscsi REST API reference: https://docs.ceph.com/en/latest/rbd/iscsi-target-cli-manual-install/
- RFC 3720 / RFC 7143 (iSCSI protocol and IQN naming conventions)
- open-iscsi iscsiadm man page for initiator discovery and login commands

## Issues Found

1. **Missing global disk registration step**: The post went directly from creating the RBD image to adding it to a target, skipping the required step of registering the disk globally in gwcli at the `/disks` path using `create pool=iscsi image=vol1`. Added a new "Registering the RBD Disk" section with the correct command.

2. **Incorrect disk add syntax (`add rbd iscsi vol1`)**: gwcli references disks in `pool/image` format (e.g., `iscsi/vol1`). The `rbd` prefix is not part of the gwcli disk path. Fixed to `add iscsi/vol1`.

3. **Nonexistent `/luns` path under target**: gwcli does not have a separate `luns` subdirectory under a target. Adding a disk to the target's `disks` directory automatically creates the LUN mapping. Removed the incorrect separate "Map the disk to a LUN" step and its `cd luns` / `add rbd/iscsi/vol1` commands.

4. **Incorrect LUN assignment under host ACL**: gwcli does not have a `luns` subdirectory under a host entry. The correct command to map a disk to an initiator is `disk add iscsi/vol1` at the host level. Fixed the command and removed the incorrect `cd luns` navigation.

5. **Incorrect `rbd/iscsi/vol1` path format**: All references using the `rbd/pool/image` three-part path were corrected to the proper `pool/image` format (`iscsi/vol1`).

## Review Notes
- The REST API examples use default credentials (`admin:admin`) and `-k` to skip TLS verification. This is fine for a tutorial but readers should be aware these are not production-safe defaults.
- The `ceph osd pool create iscsi 64 64` command specifies both `pg_num` and `pgp_num` explicitly. In Ceph Nautilus and later, `pgp_num` is auto-adjusted to match `pg_num`, so the second `64` is optional but not harmful.
- The `targetcli ls /iscsi` verification command works because ceph-iscsi configures the LIO kernel target subsystem under the hood. This is a valid verification method, though `gwcli` itself can also be used to inspect the configuration.
- The post mentions Rook in tags but does not cover Rook-specific iSCSI configuration. The content is about standalone ceph-iscsi, which is accurate since Rook delegates iSCSI gateway management to ceph-iscsi.
