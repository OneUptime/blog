# Validation Summary: How to Configure Multi-Backend Cinder with Ceph Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (OSD pools, CRUSH rules, RBD, auth)
- Rook (referenced in tags, not directly used in commands)
- OpenStack Cinder (multi-backend configuration, volume types, RBD driver)
- OpenStack CLI (volume type and volume management)

## Sources Consulted
- Ceph documentation: pool creation (`ceph osd pool create`), CRUSH rules (`ceph osd crush rule create-replicated`), and auth capabilities (`profile rbd`) — https://docs.ceph.com/en/latest/rados/operations/pools/ and https://docs.ceph.com/en/latest/rados/operations/user-management/
- OpenStack Cinder documentation: multi-backend configuration, RBD driver options (`volume_driver`, `rbd_pool`, `rbd_user`, `rbd_secret_uuid`, `enabled_backends`, `default_volume_type`) — https://docs.openstack.org/cinder/latest/configuration/block-storage/drivers/ceph-rbd-volume-driver.html
- OpenStack CLI reference: `openstack volume type create`, `openstack volume create`, `openstack volume show` — https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/volume-type.html

## Issues Found
1. **`default_volume_type` mismatch in cinder.conf**: The config set `default_volume_type = standard`, but no volume type named "standard" is created anywhere in the tutorial. The volume types created are "premium-ssd" and "standard-hdd". This would cause Cinder to fail when a user creates a volume without specifying a type. Fixed to `default_volume_type = standard-hdd`.

2. **Redundant and misleadingly commented command in Step 4**: The command `openstack volume type set --property volume_backend_name=ceph-hdd standard-hdd` was redundant because the `volume_backend_name` property was already set during the `volume type create` call on the line above. The comment "Set the default" was also misleading — `volume type set --property` sets extra specs on a volume type, it does not set the default volume type (which is configured via `default_volume_type` in cinder.conf). Removed the redundant command and its misleading comment.

## Review Notes
- The tutorial creates a CRUSH rule for the SSD pool to target SSD-class OSDs, but does not create an analogous CRUSH rule for the HDD pool. In a mixed-device cluster, the HDD pool would use the default CRUSH rule, which could place data on any OSD including SSDs. A production setup would benefit from also creating an `hdd-rule` and applying it to `hdd-volumes`. This is a best-practice consideration rather than an error, since the default rule may be acceptable depending on cluster topology.
- The `ec-volumes` erasure-coded pool mentioned in the Use Case section is never configured in the tutorial steps. This is acceptable since it's listed as an example of what a cluster "might have," but readers may expect guidance on it.
- The `rbd_secret_uuid` placeholders are correctly shown as values the reader must fill in — these are libvirt secret UUIDs needed for Nova to attach Ceph-backed volumes to instances.
- The service name `openstack-cinder-volume` is specific to RHEL/CentOS deployments. Ubuntu-based deployments use `cinder-volume`. This is not an error but is worth noting for readers on different distributions.
