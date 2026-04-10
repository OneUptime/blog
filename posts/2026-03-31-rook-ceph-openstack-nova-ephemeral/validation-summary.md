# Validation Summary: How to Set Up Ceph as OpenStack Nova Ephemeral Backend

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (RBD / RADOS Block Device)
- OpenStack Nova (compute service)
- OpenStack Glance (image service, referenced)
- libvirt / virsh
- OpenStack CLI (python-openstackclient)

## Sources Consulted
- Nova libvirt configuration source: https://github.com/openstack/nova/blob/master/nova/conf/libvirt.py
- Nova Mitaka release notes (deprecation of live_migration_flag): https://docs.openstack.org/releasenotes/nova/mitaka.html
- Nova live migration configuration guide: https://docs.openstack.org/nova/latest/admin/configuring-migrations.html
- Ceph RBD OpenStack integration docs: https://docs.ceph.com/en/latest/rbd/rbd-openstack/
- Ceph libvirt integration docs: https://docs.ceph.com/en/latest/rbd/libvirt/
- oslo.config configuration file format: https://docs.openstack.org/oslo.config/latest/configuration/format.html
- Nova extra specs documentation: https://docs.openstack.org/nova/latest/configuration/extra-specs.html

## Issues Found

### 1. Deprecated `live_migration_flag` option (Step 4)
- **What was wrong:** The `live_migration_flag` option with raw libvirt flags (`VIR_MIGRATE_UNDEFINE_SOURCE,VIR_MIGRATE_PEER2PEER,VIR_MIGRATE_LIVE,VIR_MIGRATE_PERSIST_DEST,VIR_MIGRATE_TUNNELLED`) has been deprecated since the Nova Mitaka release (2016). Modern Nova manages most migration flags internally.
- **What was changed:** Replaced `live_migration_flag = "VIR_MIGRATE_UNDEFINE_SOURCE,..."` with `live_migration_tunnelled = true`, which is the current replacement option. Nova automatically handles the other flags (UNDEFINE_SOURCE, PEER2PEER, LIVE, PERSIST_DEST).
- **Why:** Using deprecated options may generate warnings or be silently ignored in current OpenStack releases, leading readers to a broken configuration.

### 2. Incorrect quoting on `disk_cachemodes` value (Step 4)
- **What was wrong:** The value was quoted as `disk_cachemodes = "network=writeback"`. Since `disk_cachemodes` is a ListOpt in oslo.config, the quotes would be parsed as literal characters and become part of the value, causing the cache mode to not be recognized.
- **What was changed:** Removed the quotes: `disk_cachemodes = network=writeback`.
- **Why:** oslo.config ListOpt does not strip surrounding quotes from values, so the quoted form would produce an invalid cache mode string.

## Review Notes
- The `mgr` capability for `client.nova` only grants access to the `vms` pool. If the Ceph cluster requires mgr caps for cross-pool clone operations (e.g., cloning from the `images` pool), the mgr line may need to be expanded to include `profile rbd pool=images`. This depends on the Ceph version; current versions generally work with the osd caps alone for clone operations.
- The `systemctl restart openstack-nova-compute` service name follows the RHEL/CentOS convention. On Ubuntu/Debian systems, the service is typically named `nova-compute`. The post could note this distinction, but it is not incorrect.
- The `hw_disk_discard = unmap` option exists in nova.conf [libvirt] but is more commonly set as a flavor extra spec (`hw:disk_discard=unmap`) or image property. The nova.conf approach applies it globally to all instances, which may not be desired in all deployments.
- The post does not specify an OpenStack release version. The configuration shown (after fixes) is compatible with modern releases (Stein through 2024.2+).
