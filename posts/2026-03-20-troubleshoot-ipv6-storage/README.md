# How to Troubleshoot IPv6 Storage Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NFS, iSCSI, Storage, Troubleshooting, Networking

Description: Diagnose and resolve IPv6 storage connectivity issues for NFS, iSCSI, Ceph, and SMB, covering network reachability, firewall rules, MTU problems, and protocol-specific debugging.

## Introduction

Storage connectivity over IPv6 fails for reasons that differ from typical application-layer issues: MTU mismatches cause silent data corruption in NFS, ICMPv6 blocking prevents path MTU discovery for iSCSI, and firewall rules may permit TCP handshakes but block auxiliary ports needed for NFSv3. This guide covers a systematic diagnostic approach for IPv6 storage protocols.

## Diagnostic Framework

```text
Storage connectivity problem
│
├─ Layer 1/2: Physical/link connectivity
│  └─ ip -6 link show, ping6 with small packet
│
├─ Layer 3: IPv6 routing
│  └─ ip -6 route get, traceroute6
│
├─ Layer 4: Port reachability
│  └─ nc -6 -zv server port, ss -tlnp
│
├─ MTU/PMTUD
│  └─ ping6 with large payload, tcpdump for ICMPv6 too big
│
└─ Protocol-specific
   └─ showmount, rpcinfo, iscsiadm, ceph status
```

## Step 1: Verify IPv6 Connectivity

```bash
# Basic ping6 to storage server

ping6 -c 4 2001:db8::1
# "Network unreachable" → check routing
# "No route to host" → check firewall or routing
# Timeout → check remote firewall

# Check local IPv6 routing table
ip -6 route show
ip -6 route get 2001:db8::1

# Traceroute6 to identify where traffic is dropped
traceroute6 2001:db8::1
# Look for "* * *" entries indicating blocked hops
```

## Step 2: Check Port Reachability

```bash
# NFS
nc -6 -zv 2001:db8::1 2049     # NFS main port
nc -6 -zv 2001:db8::1 111      # rpcbind (NFSv3)

# iSCSI
nc -6 -zv 2001:db8::1 3260

# Ceph
nc -6 -zv 2001:db8::10 6789    # MON v1
nc -6 -zv 2001:db8::10 3300    # MON v2

# SMB/CIFS
nc -6 -zv 2001:db8::1 445

# Check server is listening
ssh 2001:db8::1 'ss -tlnp | grep -E "2049|111|3260|6789|445"'
```

## Step 3: MTU and Path MTU Discovery

```bash
# MTU issues are common with IPv6 storage (jumbo frames, tunnels)

# Test with specific packet sizes
ping6 -s 1400 2001:db8::1   # Standard MTU (1500 - 48 byte overhead leaves safe margin)
ping6 -s 8952 2001:db8::1   # Jumbo frame (9000 - 48 bytes: 40 IPv6 + 8 ICMPv6)
ping6 -M do -s 1452 2001:db8::1  # DF-bit set (tests PMTUD)

# Capture ICMPv6 "Packet Too Big" messages
tcpdump -i eth0 -n "icmp6 and icmp6[0] == 2"
# Type 2 = Packet Too Big - indicates MTU mismatch

# Check interface MTU
ip link show eth0 | grep mtu

# Check effective path MTU
ip -6 route get 2001:db8::1
# Look for "mtu 1500" or similar in output

# Fix: set rsize/wsize in NFS to stay within MTU
mount -t nfs4 -o rsize=1400,wsize=1400 [2001:db8::1]:/srv/data /mnt/data
```

## Step 4: ICMPv6 Firewall Issues

```bash
# ICMPv6 must NOT be fully blocked - NDP and PMTUD require it

# Check if ICMPv6 is being blocked
ip6tables -L INPUT -n | grep icmpv6

# Essential ICMPv6 types that must be allowed for storage:
# Type 2  (Packet Too Big) - required for PMTUD
# Type 135 (Neighbor Solicitation) - required for NDP
# Type 136 (Neighbor Advertisement) - required for NDP

# Allow minimum ICMPv6 for storage connectivity
ip6tables -A INPUT -p icmpv6 --icmpv6-type 2 -j ACCEPT    # Packet Too Big
ip6tables -A INPUT -p icmpv6 --icmpv6-type 135 -j ACCEPT  # NS
ip6tables -A INPUT -p icmpv6 --icmpv6-type 136 -j ACCEPT  # NA

# Verify NDP works (neighbor discovery)
ip -6 neigh show
# Should show "2001:db8::1 dev eth0 lladdr xx:xx:xx:xx:xx:xx REACHABLE"
```

## Step 5: NFS-Specific Debugging

```bash
# NFS mount hangs - check if server exports the path
showmount -e [2001:db8::1]

# NFS mount fails with "Permission denied"
# Check /etc/exports on server: is client's IPv6 in allowed range?

# Check RPC services over IPv6 (NFSv3)
rpcinfo -p "[2001:db8::1]"

# Enable NFS client debug logging
mount -t nfs4 -v [2001:db8::1]:/srv/data /mnt/data 2>&1

# Check kernel NFS logs
dmesg | grep -i nfs | tail -20
journalctl -k -g nfs | tail -30

# Test NFS performance
dd if=/dev/zero of=/mnt/data/test bs=1M count=100 conv=fdatasync
# Slow performance: check rsize/wsize and MTU
```

## Step 6: iSCSI-Specific Debugging

```bash
# Discovery fails
iscsiadm -m discovery -t sendtargets -p "[2001:db8::1]:3260"
# "iscsiadm: cannot make connection..." → port blocked or server not listening

# Session disconnects
iscsiadm -m session -P 3 | grep -E "State|Iface"
dmesg | grep -i iscsi | tail -20

# Increase iSCSI timeouts for high-latency IPv6 paths
iscsiadm -m node -T iqn.example:storage -p [2001:db8::1]:3260 \
    --op=update -n node.conn[0].timeo.login_timeout -v 60
```

## Step 7: Ceph-Specific Debugging

```bash
# Ceph cluster unreachable
ceph status
# "HEALTH_WARN mons are allowing insecure global_id reclaim" etc.

# Check monitor connectivity over IPv6
ceph mon stat
ceph -s

# OSD is not connecting
ceph osd stat
ceph health detail
journalctl -u ceph-osd@0 -n 100 | grep -i err
```

## Common Fixes Summary

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Mount hangs indefinitely | ICMPv6 blocked (PMTUD fails) | Allow ICMPv6 type 2 in firewall |
| "Permission denied" on NFS mount | Client IPv6 not in export | Add client /64 to /etc/exports |
| iSCSI discovery times out | Port 3260 blocked over IPv6 | Add ip6tables rule for port 3260 |
| Slow NFS performance | MTU mismatch | Set rsize=wsize=1400 |
| NDP failure | No ICMPv6 type 135/136 | Allow NS/NA ICMPv6 types |

## Conclusion

IPv6 storage troubleshooting follows a layered approach: verify L3 routing with `ip -6 route get`, confirm port reachability with `nc -6`, diagnose MTU issues with sized ping6 tests, and ensure ICMPv6 is permitted for Packet Too Big messages and NDP. NFS is the most sensitive to MTU mismatches because large reads/writes trigger PMTUD; reducing `rsize` and `wsize` is the fastest workaround. iSCSI and SMB are simpler to diagnose as single-port TCP protocols, while Ceph requires monitoring daemon logs for inter-cluster IPv6 connectivity issues.
