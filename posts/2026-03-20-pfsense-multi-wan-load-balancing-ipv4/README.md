# How to Set Up Multi-WAN Load Balancing for IPv4 on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, Multi-WAN, Load Balancing, IPv4, Failover, High Availability

Description: Configure multi-WAN load balancing and failover on pfSense to distribute IPv4 outbound traffic across multiple ISP connections with automatic failover when an uplink fails.

## Introduction

pfSense multi-WAN uses gateway groups to balance or fail-over outbound IPv4 traffic across two or more ISP connections. Gateways are monitored with ICMP pings; failed gateways are removed from the active group.

## Step 1: Configure WAN Interfaces

Navigate to **Interfaces > Assignments**:
- WAN (em0): Primary ISP - `203.0.113.2/30`, GW: `203.0.113.1`
- OPT1 (em2): Secondary ISP - `198.51.100.6/30`, GW: `198.51.100.5`
  - Rename OPT1 to `WAN2`

## Step 2: Gateway Configuration

Navigate to **System > Routing > Gateways**:

Primary gateway:
```text
Name:       GW_WAN
Interface:  WAN
Gateway IP: 203.0.113.1
Monitor IP: 8.8.8.8
```

Secondary gateway:
```text
Name:       GW_WAN2
Interface:  WAN2
Gateway IP: 198.51.100.5
Monitor IP: 8.8.4.4
```

## Step 3: Gateway Groups

Navigate to **System > Routing > Gateway Groups > Add**:

**Load Balancing Group:**
```text
Name:           LOAD_BALANCE
GW_WAN  Tier 1  (active)
GW_WAN2 Tier 1  (active - same tier = load balance)
Trigger Level:  Packet Loss or High Latency
```

**Failover Group:**
```text
Name:           FAILOVER
GW_WAN  Tier 1  (primary)
GW_WAN2 Tier 2  (standby - higher tier = backup only)
Trigger Level:  Packet Loss or High Latency
```

## Step 4: Firewall Rule - Route LAN Through Gateway Group

Navigate to **Firewall > Rules > LAN > Edit** (default allow rule):

```text
Action:          Pass
Source:          LAN net
Destination:     any
Gateway:         LOAD_BALANCE   ← Change from default to gateway group
```

## Step 5: Sticky Connections (Session Persistence)

Navigate to **System > Advanced > Miscellaneous**:
```text
Sticky Connections:      checked
Source tracking timeout: blank (default - expires with states)
```

This ensures a user's session stays on the same WAN during an active connection.

## Policy Routing - Specific Traffic via Specific WAN

```text
# Route VoIP through WAN2 for lower latency

Firewall > Rules > LAN > Add:
  Source:      LAN net
  Destination: any
  Protocol:    UDP
  Port:        5060,10000-20000
  Gateway:     GW_WAN2
  Place ABOVE general load balance rule
```

## Monitor Gateway Health

Navigate to **Status > Gateways**:
- Shows RTT, packet loss, current status for each gateway

Navigate to **Status > Dashboard > Gateways widget**:
- Real-time gateway monitoring

## Conclusion

pfSense multi-WAN requires two WAN interfaces with gateways, a gateway group (load balance = same tier, failover = different tiers), and a LAN firewall rule pointing to the gateway group. Use sticky connections to prevent session disruption, and add policy routing rules to direct sensitive traffic like VoIP through a specific preferred uplink.
