# Validation Summary: How to Troubleshoot OpenStack-Ceph Integration Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (RBD, CephFS, MDS, OSD, monitor)
- OpenStack (Cinder, Nova, Manila, Glance)
- libvirt / virsh
- systemd journalctl
- firewalld

## Sources Consulted
- Ceph documentation: `ceph auth get-key` returns base64-encoded keys by default (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- OpenStack CLI documentation: `openstack server migration abort` syntax requires both server and migration IDs (https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server-migration.html)
- libvirt `virsh secret-get-value` documentation (https://libvirt.org/manpages/virsh.html)
- Ceph RBD CLI reference (https://docs.ceph.com/en/latest/man/8/rbd/)
- OpenStack Cinder Ceph integration guide (https://docs.openstack.org/cinder/latest/configuration/block-storage/drivers/ceph-rbd-volume-driver.html)

## Issues Found
1. **Double base64 encoding of Ceph key**: The command `ceph auth get-key client.nova | base64` would double-encode the key because `ceph auth get-key` already returns a base64-encoded string. This would cause the comparison with `virsh secret-get-value` to always fail. Fixed by removing the `| base64` pipe and adding a clarifying comment.

2. **Invalid `openstack server migrate --abort` syntax**: The command `openstack server migrate --abort <instance-id>` does not exist in the OpenStack CLI. The correct command is `openstack server migration abort <server> <migration>`, which requires both a server ID and a migration ID. Fixed to use the correct syntax.

## Review Notes
- The monitor connectivity check only tests port 6789 (Ceph v1 messenger protocol). Since Ceph Nautilus (14.x+), monitors also listen on port 3300 for the msgr2 protocol. Modern deployments may need to check both ports. This is not incorrect but could be expanded in a future update.
- `ceph mds stat` is considered deprecated in newer Ceph releases in favor of `ceph fs status`, but the post already includes `ceph fs status cephfs` alongside it, so this is acceptable.
- The systemd service name `openstack-cinder-volume` is RHEL/CentOS-specific; on Ubuntu/Debian deployments it is typically `cinder-volume`. The post does not note this distinction, but it is a minor platform variance rather than an error.
