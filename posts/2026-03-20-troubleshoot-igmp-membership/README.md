# How to Troubleshoot IGMP Membership Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IGMP, Multicast, Troubleshooting, tcpdump, Linux, Networking

Description: Troubleshoot IGMP membership report issues, diagnose why multicast receivers are not receiving traffic, and verify IGMP joins and leaves with packet captures.

## Introduction

IGMP (Internet Group Management Protocol) is the signaling protocol hosts use to join and leave multicast groups. When multicast traffic doesn't reach a receiver, the problem is often that an IGMP join was never sent, was blocked by a firewall, or expired. Troubleshooting IGMP requires capturing IGMP messages on the wire, verifying the host's group membership state, and checking that the router received and acted on the membership reports.

## Capture and Analyze IGMP Messages

```bash
# Capture all IGMP traffic:

tcpdump -i eth0 -n 'igmp'

# Example IGMP messages:
# 09:00:01 IP 0.0.0.0 > 224.0.0.1: igmp query v2
#   ← Router asking "who is in a multicast group?"
#
# 09:00:02 IP 192.168.1.10 > 239.1.1.1: igmp v2 report 239.1.1.1
#   ← Host joining group 239.1.1.1
#
# 09:00:10 IP 192.168.1.10 > 224.0.0.2: igmp leave 239.1.1.1
#   ← Host leaving group 239.1.1.1 (IGMPv2)

# Capture with verbose IGMP details:
tcpdump -i eth0 -n -v 'igmp'

# Capture IGMP type 0x22 (IGMPv3 reports):
tcpdump -i eth0 -n 'igmp[0] == 0x22'
# 0x11 = Membership Query
# 0x16 = Version 2 Membership Report
# 0x17 = Leave Group
# 0x22 = Version 3 Membership Report
```

## Verify IGMP State on Host

```bash
# Check current IGMP group memberships:
cat /proc/net/igmp

# Parse readable output:
python3 - <<'PY'
import socket
import sys

iface = None
with open("/proc/net/igmp") as f:
    next(f, None)
    for line in f:
        fields = line.split()
        if not fields:
            continue
        if ":" in fields:
            iface = fields[1]
            continue
        if iface and len(fields[0]) == 8:
            group = socket.inet_ntoa(int(fields[0], 16).to_bytes(4, sys.byteorder))
            print(f"Interface: {iface} Group: {group}")
PY

# Or use ip command:
ip maddr show
# Shows multicast addresses per interface, including link-layer and IP memberships

# Check IGMPv3 source-specific memberships:
cat /proc/net/mcfilter
# Shows (source, group) pairs for IGMPv3

# Check IGMP version used:
cat /proc/net/igmp | head -5
# Querier column shows V1, V2, or V3 for each interface
```

## Diagnose Missing IGMP Joins

```bash
# Problem: multicast traffic not arriving despite app subscribing

# Step 1: Verify app joined the group
ip maddr show dev eth0
# Should list the group address your app joined under an "inet" entry

# Step 2: Watch for IGMP reports when app starts:
tcpdump -i eth0 -n 'igmp' &
# Start your application...
# Should see: IP <host> > <mcast-group>: igmp v2 report <group>

# Step 3: Verify IGMP query/response cycle:
# Routers commonly send queries every 60-125 seconds; the IGMPv2 default is 125 seconds
tcpdump -i eth0 -n 'igmp[0] == 0x11'  # Membership queries
# If NO queries arrive: no IGMP querier present
# If no querier: memberships may not be maintained in switches

# Step 4: Check IGMP state on router (Cisco):
# show ip igmp groups
# show ip igmp interface <interface>
```

## Check IGMP Suppression and Timers

```bash
# IGMPv2: hosts use random delay before responding to queries
# to avoid simultaneous reports (report suppression)

# IGMP query response time (max response time in query):
tcpdump -i eth0 -n -v 'igmp[0] == 0x11' 2>/dev/null | grep "max resp"
# Default: 10 seconds max response time

# IGMP membership timeout:
# If no reports refresh the entry within group-membership-interval:
#   group-membership-interval = robustness * query-interval + max-response-time
#   Default: 2 * 125 + 10 = 260 seconds

# Check kernel IGMP timers:
cat /proc/net/igmp
# Timer column: running flag and remaining time in kernel clock ticks

# Force immediate IGMP report by causing the application/socket to leave and rejoin.
# `ip maddr add/del` only manages static link-layer multicast filters;
# it does not join IP multicast groups or send IGMP reports.
# Restart the application that joined, or have it drop and re-add IP_ADD_MEMBERSHIP.

# Watch for the resulting IGMP report:
tcpdump -i eth0 -n 'igmp' -c 5
```

## Diagnose IGMP Snooping Issues

```bash
# Problem: IGMP joins sent but multicast still not arriving

# Possible cause: IGMP snooping issue on switch

# Check if IGMP reports are reaching the switch port:
# Capture on the uplink interface (not the host interface)
tcpdump -i eth1 -n 'igmp'  # eth1 = uplink to router/switch

# Verify multicast is NOT arriving on ports without members:
# On a host NOT subscribed to 239.1.1.1:
timeout 10 tcpdump -i eth0 -n 'dst 239.1.1.1' 2>/dev/null | wc -l
# Should be 0 if IGMP snooping is working

# Force IGMP version to v2 (some switches have v3 issues):
echo 2 > /proc/sys/net/ipv4/conf/eth0/force_igmp_version
# 0 = no enforced version; IGMPv1/v2 fallback allowed (default)
# 2 = force IGMPv2
# 3 = force IGMPv3; Linux recommends the default 0 for normal use

# Check current IGMP version:
cat /proc/sys/net/ipv4/conf/eth0/force_igmp_version
```

## Common IGMP Troubleshooting Scenarios

```bash
# Scenario 1: No IGMP query on subnet (no querier)
# Symptom: Switch entries time out, multicast stops after ~260 seconds
# Fix: Configure IGMP querier on switch or enable pimd/smcrouted

# Scenario 2: Firewall dropping IGMP
# Symptom: Join sent but router doesn't see it
tcpdump -i eth0 'igmp'  # Check joins on host side
# Check iptables:
iptables -L -v -n | grep igmp
# IGMP runs on IP protocol 2:
iptables -I INPUT -p igmp -j ACCEPT
iptables -I OUTPUT -p igmp -j ACCEPT

# Scenario 3: IGMPv3 vs v2 mismatch
# Symptom: Some hosts can't join groups
# Fix: Force consistent IGMP version
for iface in eth0 eth1; do
    echo 2 > /proc/sys/net/ipv4/conf/$iface/force_igmp_version
done
```

## Conclusion

IGMP troubleshooting starts with `tcpdump -i eth0 -n 'igmp'` to verify membership reports are being sent and received. Check `/proc/net/igmp` to confirm the kernel has the group registered. If the join exists locally but multicast doesn't arrive, the problem is upstream: check that the IGMP report reached the router (`show ip igmp groups` on Cisco), verify IGMP snooping is tracking the membership, and confirm no firewall (iptables) is blocking protocol 2 (IGMP). For persistent issues, force IGMPv2 with `echo 2 > /proc/sys/net/ipv4/conf/eth0/force_igmp_version` as a compatibility workaround.
