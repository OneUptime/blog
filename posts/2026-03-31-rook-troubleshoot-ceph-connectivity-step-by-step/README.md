# How to Troubleshoot Ceph Connectivity Issues Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Network, Connectivity, Troubleshooting

Description: Troubleshoot Ceph network connectivity issues step by step, from basic ping tests through port checks, firewall rules, and cluster network configuration validation.

---

Ceph is highly sensitive to network quality. Connectivity issues between MONs, OSDs, and clients manifest as slow requests, PG degradation, or complete cluster unavailability. This guide walks through a systematic network diagnostic process.

## Step 1 - Verify Basic Network Reachability

Test connectivity between Ceph nodes on both the public and cluster networks:

```bash
# From each Ceph host, ping all other hosts
ping -c 4 ceph-osd-host-2
ping -c 4 ceph-osd-host-3
ping -c 4 ceph-mon-host-1

# Check for packet loss
mtr --report --report-cycles 100 ceph-osd-host-2
```

Any packet loss above 0.1% on the cluster network warrants hardware investigation.

## Step 2 - Verify Ceph Port Accessibility

Ceph uses specific TCP ports. Verify they are reachable:

```bash
# MON ports (3300 for v2, 6789 for v1)
nc -zv ceph-mon-1 3300
nc -zv ceph-mon-1 6789

# OSD ports (6800-7300 range, typically 6800-6810 per OSD)
nc -zv ceph-osd-1 6800
nc -zv ceph-osd-1 6801

# MGR dashboard (8443 default SSL port) and Prometheus metrics
nc -zv ceph-mgr-1 8443
nc -zv ceph-mgr-1 9283
```

## Step 3 - Check Firewall Rules

```bash
# On RHEL/CentOS with firewalld
firewall-cmd --list-all

# Expected Ceph rules
firewall-cmd --add-service=ceph --permanent
firewall-cmd --add-service=ceph-mon --permanent
firewall-cmd --reload

# On Ubuntu with ufw
ufw status
ufw allow proto tcp from CEPH_SUBNET to any port 3300:7300
```

## Step 4 - Verify Ceph Network Configuration

Check which networks Ceph is configured to use:

```bash
ceph config get mon public_network
ceph config get osd cluster_network

# View the current bind addresses
ceph mon dump
ceph osd dump | grep "^osd\." | head -5
```

If the public_network or cluster_network is wrong, update it:

```bash
ceph config set global public_network "10.0.1.0/24"
ceph config set global cluster_network "10.0.2.0/24"
```

## Step 5 - Check for MTU Mismatches

MTU mismatches cause intermittent packet loss for large writes:

```bash
# Check MTU on Ceph network interfaces
ip link show eth0 | grep mtu
ip link show eth1 | grep mtu

# Test with large packets (adjust 8972 for your expected MTU)
ping -M do -s 8972 ceph-osd-host-2

# Set MTU if needed
ip link set eth1 mtu 9000
```

## Step 6 - Check OSD Messenger Logs

If network is OK but OSDs still cannot communicate:

```bash
ceph daemon osd.0 config get ms_bind_addr
journalctl -u ceph-osd@0 --since "30 min ago" | grep -i "network\|connect\|bind\|timeout"
```

## Step 7 - Check Client Connectivity

For Kubernetes clients, verify CSI node connectivity:

```bash
kubectl get pods -n rook-ceph | grep csi-rbdplugin
kubectl logs -n rook-ceph -l app=csi-rbdplugin --container csi-rbdplugin | grep -i "err\|fail\|connect" | tail -20
```

## Summary

Ceph connectivity troubleshooting follows a clear path from basic ping tests through port checks, firewall rules, network configuration, MTU validation, and finally daemon-level messenger logs. Most connectivity issues are caused by either firewall rules blocking Ceph ports or MTU mismatches causing silent packet drops on large writes.
