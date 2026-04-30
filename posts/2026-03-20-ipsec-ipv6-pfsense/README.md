# How to Configure IPsec IPv6 on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, pfSense, VPN, Firewall

Description: Learn how to configure IPv6 IPsec site-to-site VPN tunnels on pfSense, including Phase 1 and Phase 2 settings, firewall rules, and troubleshooting.

## Overview

pfSense uses strongSwan under the hood for IPsec. Configuring IPv6 IPsec in pfSense is done through the web UI under VPN → IPsec. The process involves creating a Phase 1 (IKE SA) and Phase 2 (IPsec SA) entry for each site-to-site tunnel.

## Prerequisites

- pfSense with a global IPv6 address on WAN interface
- Remote peer's IPv6 address
- Matching pre-shared key on both pfSense instances

## Configuring IPv6 IPsec (Web UI)

### Phase 1 (IKE SA Configuration)

Navigate to **VPN → IPsec → Tunnels → Add P1**:

```text
General Information:
  Key Exchange Version: IKEv2
  Internet Protocol:    IPv6
  Interface:            WAN (or your IPv6 uplink)
  Remote Gateway:       2001:db8:0:2::1

Phase 1 Proposal (Authentication):
  Authentication Method: Mutual PSK
  My Identifier:         My IP Address
  Peer Identifier:       Peer IP Address
  Pre-Shared Key:        [your strong key]

Phase 1 Proposal (Encryption):
  Encryption Algorithm: AES 256 bits
  Hash Algorithm:       SHA256
  DH Group:             14 (2048 bit)
  Lifetime:             28800

Advanced Options:
  Dead Peer Detection:  Enable
  DPD Delay:            10
  DPD Max Failures:     3
```

### Phase 2 (IPsec SA / Tunnel)

Click **Show Phase 2 Entries** → **Add P2**:

```text
General Information:
  Mode: Tunnel IPv6

Networks:
  Local Network:  Network - 2001:db8:1::/48
  Remote Network: Network - 2001:db8:2::/48

Phase 2 Proposal (SA/Key Exchange):
  Encryption Algorithms: AES256-GCM 128-bit
  PFS Group: 14 (2048 bit)
  Lifetime: 3600
```

### Apply and Connect

Click **Save** then **Apply Changes**.

Navigate to **Status → IPsec** and click **Connect VPN** to initiate.

## Firewall Rules for IPsec

### WAN Rules (allow IKE and ESP)

pfSense automatically adds hidden WAN rules for enabled IPsec tunnels. Add manual WAN rules only if you have disabled auto-added VPN rules under **System → Advanced → Firewall & NAT**.

Navigate to **Firewall → Rules → WAN**:

```text
Add rule:
  Action:     Pass
  Interface:  WAN
  Protocol:   UDP
  Source:     2001:db8:0:2::1
  Destination: WAN Address (IPv6)
  Dest Port:  500 (IKE)

Add rule:
  Action:     Pass
  Interface:  WAN
  Protocol:   UDP
  Source:     2001:db8:0:2::1
  Destination: WAN Address (IPv6)
  Dest Port:  4500 (NAT-T)

Add rule:
  Action:     Pass
  Interface:  WAN
  Protocol:   ESP
  Source:     2001:db8:0:2::1
  Destination: WAN Address (IPv6)
```

### IPsec Interface Rules (allow tunnel traffic)

Navigate to **Firewall → Rules → IPsec**:

```text
Add rule:
  Action:     Pass
  Interface:  IPsec
  Protocol:   Any
  Source:     2001:db8:2::/48
  Destination: 2001:db8:1::/48
```

Traffic from local hosts to the remote `/48` is still controlled by rules on the local interface, such as **Firewall → Rules → LAN**.

## CLI Access (SSH)

pfSense runs FreeBSD. You can verify IPsec from the command line:

```bash
# SSH to pfSense

ssh admin@pfsense.local

# Show configured connections
swanctl --list-conns

# Show active IKE and CHILD SAs
swanctl --list-sas

# Show security associations
setkey -D   # IPsec SA database

# Show security policy database
setkey -DP  # IPsec SP database

# Check IPsec logs
tail -50 /var/log/ipsec.log

# Monitor IKEv2 negotiation
tail -F /var/log/ipsec.log
```

## IPv6 Routing Through the Tunnel

For **Tunnel IPv6** phase 2 entries, pfSense does not add a normal IPv6 route to the system routing table. Traffic is matched by IPsec security policy entries instead.

```bash
# On pfSense CLI: Verify the IPsec policy selectors
setkey -DP

# Test connectivity from the firewall itself by using
# a source address inside the local Phase 2 network
ping -6 -S 2001:db8:1::1 2001:db8:2::1
```

Static routes and tunnel-interface gateways apply to **Routed (VTI)** IPsec, not **Tunnel IPv6** policy-based phase 2 entries.

## Troubleshooting

```bash
# From pfSense CLI:
# List the connection names (conX)
swanctl --list-conns

# Manually initiate a tunnel
swanctl --initiate --child conX

# View active SAs for a specific connection
swanctl --list-sas --ike conX

# Enable verbose logging
# In pfSense web UI: VPN → IPsec → Advanced Settings
# Set IKE SA, IKE Child SA, and Configuration Backend to "Diag"

# Check for firewall blocking IPsec on the WAN interface
tcpdump -ni <wan-if> 'udp port 500 or udp port 4500 or proto 50'
```

## Summary

pfSense IPv6 IPsec configuration uses Phase 1 (IKEv2, AES-256, SHA-256, DH group 14) and Phase 2 (Tunnel IPv6, AES256-GCM with no separate Phase 2 hash) settings in the web UI. pfSense automatically adds the outer UDP 500, UDP 4500, and ESP rules unless auto-added VPN rules are disabled. Use the IPsec rules tab for remote-to-local tunnel traffic and the local interface rules for local-to-remote traffic. Monitor from **Status → IPsec** and from the CLI with `swanctl --list-sas` or `setkey -DP`; tunnel mode Phase 2 selectors live in the SPD rather than the normal IPv6 routing table.
