# Validation Summary: How to Fix MON_COLOCATED Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (monitor subsystem, health checks)
- Rook-Ceph operator (CephCluster CRD)
- Kubernetes (pod anti-affinity, scheduling)
- systemd (service management for bare metal Ceph)

## Sources Consulted
- Ceph official documentation — Adding/Removing Monitors: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Ceph official documentation — Manual Deployment: https://docs.ceph.com/en/latest/install/manual-deployment/
- Ceph MonCommands.h source (command definitions): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook example cluster.yaml: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml
- Kubernetes documentation — Assigning Pods to Nodes (anti-affinity): https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
1. **`ceph mon remove` is deprecated** (line 89): The command `ceph mon remove b` is deprecated in favor of `ceph mon rm b`. Changed to `ceph mon rm b`.
2. **Missing monmap retrieval step** (before line 92): The blog referenced `/tmp/monmap` in the `--mkfs` command but never showed how to obtain it. Added `ceph mon getmap -o /tmp/monmap` step.
3. **Missing keyring retrieval step** (before line 92): The blog assumed the monitor keyring existed at `/etc/ceph/ceph.mon.keyring` on the new host without showing how to get it. Added `ceph auth get mon. -o /tmp/ceph.mon.keyring` step and updated the `--mkfs` command to use the retrieved keyring path.
4. **Incorrect `ceph mon add` command at end** (line 97): The blog showed `ceph mon add b <new-host-ip>:6789` after starting the daemon. This command is not part of the standard monitor addition procedure per Ceph documentation. When the monitor is initialized with the current monmap and started, it joins the cluster automatically. Removed this incorrect step.

## Review Notes
- The Rook-Ceph section is fully correct. The `allowMultiplePerNode: false` field and the `podAntiAffinity` placement rules are both valid and correctly documented. Note that when `allowMultiplePerNode: false` is set, Rook automatically injects anti-affinity rules, making the explicit `podAntiAffinity` in `placement.mon` technically redundant — but including both is a reasonable belt-and-suspenders approach.
- The default monitor messenger port changed from 6789 (v1) to 3300 (v2/msgr2) in newer Ceph releases. The post doesn't mention a specific Ceph version, so this is not an error, but readers on modern Ceph (Nautilus+) should be aware of msgr2.
