# How to Troubleshoot NVMe-oF Connection Issues in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, Troubleshooting, Storage

Description: Diagnose and resolve NVMe-oF connection failures in Ceph, covering gateway pod errors, kernel module issues, network problems, and subsystem misconfiguration.

---

## Overview

NVMe-oF connection failures can occur at multiple layers - kernel modules, network connectivity, gateway pod health, or subsystem configuration. A systematic approach from initiator to Ceph backend quickly isolates the root cause.

## Layer 1: Kernel Module Issues

Start by verifying the initiator's kernel modules:

```bash
# Check modules are loaded
lsmod | grep nvme
# Expected: nvme_fabrics, nvme_tcp (and/or nvme_rdma)

# If missing, load them
modprobe nvme-fabrics
modprobe nvme-tcp

# Verify no module errors in kernel log
dmesg | grep -i nvme | tail -20
```

## Layer 2: Network Connectivity

Test basic connectivity from initiator to gateway:

```bash
GATEWAY_IP="10.0.1.10"

# Test TCP port 4420 (NVMe-oF default)
nc -zv $GATEWAY_IP 4420

# Test discovery port 8009
nc -zv $GATEWAY_IP 8009

# Check for firewall rules blocking NVMe-oF
iptables -L -n | grep 4420
```

## Layer 3: Gateway Pod Health

Check Rook NVMe-oF gateway pods:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nvmeof
kubectl -n rook-ceph describe pod rook-ceph-nvmeof-gw-0-xxxxx

# Check gateway logs for errors
kubectl -n rook-ceph logs rook-ceph-nvmeof-gw-0-xxxxx --tail=50

# Verify gateway process is listening
kubectl -n rook-ceph exec rook-ceph-nvmeof-gw-0-xxxxx -- \
  ss -tlnp | grep 4420
```

## Layer 4: Subsystem Configuration

Verify subsystem and listener configuration:

```bash
# List all subsystems
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof subsystem list

# Check listeners for specific subsystem
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof subsystem info --nqn nqn.2024-01.io.ceph:mysubsystem

# Verify namespace exists
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof namespace list --nqn nqn.2024-01.io.ceph:mysubsystem

# Check if RBD image exists
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd ls nvmeof-pool
```

## Layer 5: Initiator Connection Troubleshooting

Enable verbose logging on the initiator:

```bash
# Increase nvme-cli verbosity
nvme discover -t tcp -a 10.0.1.10 -s 8009 -v

# Check dmesg for connection errors
dmesg | grep nvme | tail -30

# Try connecting with debug output
nvme connect -t tcp -a 10.0.1.10 -s 4420 \
  -n nqn.2024-01.io.ceph:mysubsystem \
  --reconnect-delay 10 2>&1
```

## Common Issues and Fixes

```bash
# Issue: "Failed to write to /dev/nvme-fabrics"
# Fix: Ensure nvme-fabrics module is loaded
modprobe nvme-fabrics

# Issue: "Connection refused on port 4420"
# Fix: Verify gateway pod hostNetwork is enabled in Rook config

# Issue: "NQN mismatch"
# Fix: Verify exact NQN string matches between subsystem and connect command
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof subsystem list | grep nqn
```

## Summary

Troubleshooting NVMe-oF connections requires checking each layer: kernel modules on the initiator, network connectivity to gateway ports, gateway pod health and logs, and subsystem/namespace configuration. The most common issues are missing kernel modules, gateway pods not using host networking, or NQN string mismatches between the subsystem configuration and the initiator connect command.
