# Validation Summary: How to Manage Ceph from Proxmox Web Interface

## Status
validated

## Post Type
Guide

## Technologies Covered
- Proxmox VE (web interface and CLI)
- Ceph (distributed storage system)
- Ceph Dashboard (mgr module)
- RBD (RADOS Block Device)

## Sources Consulted
- Proxmox VE Administration Guide — Ceph management chapter (https://pve.proxmox.com/pve-docs/pve-admin-guide.html#chapter_pveceph)
- Proxmox VE Wiki — Deploy Hyper-Converged Ceph Cluster (https://pve.proxmox.com/wiki/Deploy_Hyper-Converged_Ceph_Cluster)
- Ceph Documentation — Dashboard module (https://docs.ceph.com/en/latest/mgr/dashboard/)
- Ceph Documentation — `ceph osd pool create` and pool management (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph Documentation — Monitor commands (https://docs.ceph.com/en/latest/rados/operations/monitoring/)

## Issues Found

1. **Incorrect "Datacenter -> Ceph" navigation paths**: The post referenced "Datacenter -> Ceph" as a navigation path in multiple places (Accessing the Ceph Management UI, Checking Cluster Health, Managing Pools). In Proxmox VE, Ceph management panels (Status, OSD, Pools, Monitor, etc.) are located under individual **nodes** (Node -> Ceph -> ...), not at the datacenter level. There is no dedicated "Datacenter -> Ceph" section with sub-panels in the Proxmox VE interface. Fixed all three occurrences to reference "Node -> Ceph" instead.

2. **Incorrect argument order in `ceph dashboard ac-user-create` command**: The original command was `echo -n "admin123" | ceph dashboard ac-user-create admin administrator -i -`, which places the role name (`administrator`) before the `-i -` flag. In Ceph Pacific and later, the correct syntax is `ceph dashboard ac-user-create <username> -i <password-file> [<rolename>]`. Fixed to: `echo -n "admin123" | ceph dashboard ac-user-create admin -i - administrator`.

## Review Notes
- The `ceph -w | grep rebalance` command is a loose way to watch for rebalancing activity. `ceph status` or `ceph progress` would show recovery state more directly, but the approach shown is not incorrect per se.
- The post uses a hardcoded password ("admin123") in the Ceph Dashboard user creation example. While acceptable for a tutorial, production deployments should use stronger credentials.
- The `ceph dashboard ac-user-create` syntax has varied across Ceph releases. The corrected syntax targets Ceph Pacific and later (the versions that ship with current Proxmox VE releases).
