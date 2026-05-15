# Validation Summary: How to Configure Ceph RBD Block Storage for Virtual Machine Backends on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ceph Storage
- Ceph RADOS Block Device
- libvirt
- KVM/QEMU virtualization
- XFS

## Sources Consulted
- Ceph RBD man page: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph documentation, Using libvirt with Ceph RBD: https://docs.ceph.com/en/latest/rbd/libvirt/
- libvirt Domain XML format: https://libvirt.org/formatdomain.html
- libvirt Secret XML format: https://libvirt.org/formatsecret.html
- libvirt virsh command reference: https://www.libvirt.org/manpages/virsh.html
- Red Hat Ceph Storage 8 Block Device Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/8/pdf/block_device_guide/Red_Hat_Ceph_Storage-8-Block_Device_Guide-en-US.pdf

## Issues Found
- The RBD pool setup initialized the pool before enabling the `rbd` application. Red Hat's current block device guide documents creating the pool, enabling the `rbd` application, then running `rbd pool init -p POOL_NAME`. I reordered those commands and changed the initialization command to the documented `-p` form.
- The client mapping section used `rbd map` and `rbd showmapped`. These remain common aliases in many Ceph examples, but current Ceph RBD command documentation lists the canonical forms as `rbd device map` and `rbd device list`. I updated the commands and made the Ceph user explicit with `--id admin`, matching the copied `client.admin` keyring used in the post.

## Review Notes
- The post uses `client.admin` for both host mapping and libvirt authentication. This works technically, but a production deployment should normally create a dedicated CephX user with least-privilege pool capabilities for VM access.
- The libvirt RBD XML and Ceph secret structure are consistent with current libvirt and Ceph documentation. The monitor port example uses `6789`, which is still shown in Ceph/libvirt examples, though modern Ceph clusters may also expose messenger v2 on port `3300`.
