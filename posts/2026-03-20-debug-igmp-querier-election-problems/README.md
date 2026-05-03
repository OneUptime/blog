# How to Debug IGMP Querier Election Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Multicast, IGMP, Querier, Troubleshooting, Switching

Description: Diagnose IGMP querier election failures that cause multicast group membership tables to go stale, and restore proper querier operation on your network segment.

## Introduction

IGMP requires exactly one **Querier** on each network segment to periodically send General Query messages and maintain membership tables. When querier election fails - due to misconfiguration, device failure, or version mismatch - snooping tables age out and multicast delivery stops even though receivers are still running.

## How Querier Election Works

In IGMPv2 and v3, each multicast-capable router sends General Queries. When multiple routers share a segment, they elect the one with the **lowest IP address** as the active Querier. Others become Non-Queriers and stop sending queries. If the active Querier goes silent for `Other Querier Present Interval` (typically 255 seconds), a Non-Querier takes over.

## Symptoms of a Missing Querier

- Multicast works briefly after a host joins, then stops after ~3–5 minutes
- `show ip igmp snooping groups` entries disappear over time
- Receivers confirm they are joined (`ip maddr show`) but traffic stops arriving

## Step 1: Identify the Current Querier

On a Cisco switch:

```text
show ip igmp snooping querier vlan 20
```

Expected output:

```text
Vlan  IP Address      IGMP Version  Port
----  ----------      ------------  ----
20    10.20.0.1       v2            Gi0/1
```

If the output is empty or shows "0.0.0.0", there is no active Querier on the segment.

## Step 2: Enable Querier on the Switch

When no router is present on the VLAN, enable the switch as IGMP Querier:

```text
# Cisco IOS

conf t
ip igmp snooping vlan 20 querier
ip igmp snooping vlan 20 querier address 10.20.0.1
ip igmp snooping vlan 20 querier version 2
```

## Step 3: Capture Querier Election Traffic

```bash
# Watch for IGMP General Query messages (dst 224.0.0.1, the all-systems group)
sudo tcpdump -i eth0 -n -v "ip proto 2 and dst 224.0.0.1"
```

If you see Queries arriving from two different source IPs, a querier election is ongoing. The lower IP should win within one query interval.

## Step 4: Check for Version Mismatches

Mixed IGMP versions on a segment can cause membership reports to be misinterpreted - an IGMPv2-only router will not understand IGMPv3 reports, and IGMPv3 hosts may not downgrade to v2 reports as expected:

```bash
# Check what version of IGMP messages are arriving
sudo tcpdump -i eth0 -n -v "ip proto 2" | grep "igmp"
```

If you see mixed `v2 report` and `v3 report` messages but only one type of query, force consistency:

```bash
# Force IGMPv2 on a Linux host for compatibility
echo 2 | sudo tee /proc/sys/net/ipv4/conf/eth0/force_igmp_version
```

## Step 5: Adjust Query Intervals

If the Querier is present but groups time out, the query interval may be too long relative to the **Group Membership Interval** (`Query Interval × Robustness + Max Response Time`). On Linux with pimd or smcroute:

```bash
# Check pimd configuration for query interval
cat /etc/pimd.conf | grep query
```

On Cisco:

```text
conf t
interface vlan 20
 ip igmp query-interval 30         ! Send queries every 30s (default 60s)
 ip igmp query-max-response-time 10 ! Hosts must reply within 10s
```

## Step 6: Verify No ACL Is Blocking Queries

```bash
# On Linux - ensure IGMP is not blocked by iptables
sudo iptables -L INPUT -n -v | grep -i igmp

# Allow IGMP if it is being dropped
sudo iptables -I INPUT -p igmp -j ACCEPT
```

## Common Root Causes

| Problem | Fix |
|---|---|
| No querier on segment | Enable switch as IGMP querier |
| Querier failed over but took too long | Lower Other Querier Present Interval |
| Version mismatch (v2 vs v3) | Standardize IGMP version across segment |
| ACL dropping queries | Allow IGMP (protocol 2) in firewall rules |

## Conclusion

A missing or malfunctioning IGMP Querier is the most common cause of multicast mysteriously stopping after working initially. Enable a switch-based querier as a backup, capture IGMP Queries to confirm they are flowing, and ensure no ACLs are blocking protocol 2 traffic.
