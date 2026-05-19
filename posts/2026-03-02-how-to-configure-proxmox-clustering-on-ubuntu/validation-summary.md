# Validation Summary: How to Configure Proxmox Clustering on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Proxmox VE clustering
- Corosync / votequorum
- Proxmox VE High Availability
- Proxmox VE storage management
- NFS shared storage
- Ceph distributed storage
- Ubuntu/Debian networking and chrony time synchronization

## Sources Consulted
- Proxmox VE Cluster Manager (`pvecm`) documentation: https://pve.proxmox.com/pve-docs/pvecm.1.html
- Proxmox VE Cluster Manager chapter: https://pve.proxmox.com/pve-docs/chapter-pvecm.html
- Proxmox VE Storage Manager (`pvesm`) documentation: https://pve.proxmox.com/pve-docs/pvesm.1.html
- Proxmox VE High Availability Manager (`ha-manager`) documentation: https://pve.proxmox.com/pve-docs/ha-manager.1.html
- Proxmox VE Ceph management (`pveceph`) documentation: https://pve.proxmox.com/pve-docs/pveceph.1.html
- Proxmox VE QEMU/KVM VM Manager (`qm`) documentation: https://pve.proxmox.com/pve-docs/qm.1.html
- Ubuntu package file list for `chrony`: https://packages.ubuntu.com/noble/amd64/chrony/filelist

## Issues Found
- The chrony service command used `systemctl enable --now chronyd`, but Ubuntu packages install `chrony.service`. Changed it to `systemctl enable --now chrony`.
- The `pvesm add nfs` example omitted `--path`, which Proxmox documents in the NFS storage add example. Added `--path /mnt/pve/shared-nfs`.
- The HA state list described `disabled` as making HA ignore a VM temporarily. Proxmox documents `disabled` as stopping the resource and preventing relocation, while `ignored` leaves it unmanaged. Updated the state descriptions and changed the maintenance example to use `--state ignored`.
- The maintenance migration loop used `qm list --node pve1`, but `qm list` is per-node and does not support a `--node` option. Updated the example to run on `pve1` and use `qm list`.
- The node removal example suggested running `pvecm delnode` on the node being removed. Proxmox documents powering off the removed node and running `pvecm delnode` from a remaining cluster node. Updated the example and added the documented `pvecm expected 1` fallback for loss of quorum.

## Review Notes
The title says "on Ubuntu", but the Proxmox clustering commands apply to Proxmox VE nodes, not a stock Ubuntu installation. The Ubuntu relevance is mainly the general package/networking examples and the blog taxonomy.
