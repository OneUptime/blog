# How to Configure IPsec IPv6 on OPNsense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, OPNsense, VPN, Firewall

Description: Step-by-step guide to configuring IPv6 IPsec site-to-site VPN on OPNsense, including Phase 1 and Phase 2 configuration, firewall rules, and monitoring.

## Overview

OPNsense uses strongSwan for IPsec and provides a web UI for configuration under VPN → IPsec. It supports IKEv2 with IPv6 endpoints for site-to-site tunnels. The steps below use the legacy **Tunnel Settings** Phase 1 / Phase 2 workflow; OPNsense 23.1+ also includes a newer **Connections** UI where Phase 2 entries are called children.

## Configuring IPv6 IPsec on OPNsense

### Phase 1 Configuration

Navigate to **VPN → IPsec → Tunnel Settings** and click **+** to add a Phase 1 entry:

```text
General Settings:
  Connection method: default
  Description: IPv6-Site-To-Site
  Key Exchange version: V2
  Internet Protocol: IPv6
  Interface: WAN

Remote Gateway:
  Remote gateway: 2001:db8:100::2

Authentication:
  Authentication method: Mutual PSK
  My identifier:         My IP address
  Peer identifier:       Peer IP address
  Pre-shared key:        [strong PSK]

Phase 1 Proposal:
  Encryption algorithms: AES-256
  Hash algorithms:       SHA256
  DH Groups:             14 (2048 bit MODP)
  Lifetime:              28800

Dead Peer Detection:
  Enable:  Checked
  Delay:   30
  Maxfail: 3
```

### Phase 2 Configuration

Under the Phase 1 entry, click **+** to add a Phase 2 entry:

```text
General:
  Description: site1-to-site2
  Mode: Tunnel IPv6

Local Network:
  Type: Network
  Address: 2001:db8:1::/48

Remote Network:
  Type: Network
  Address: 2001:db8:2::/48

Phase 2 Proposal:
  Encryption Algorithms: AES-GCM-256 (128-bit tag)
  PFS key group: 14 (2048 bit MODP)
  Lifetime: 3600
```

Click **Save** and then **Apply Changes**.

## Firewall Rules

### WAN Interface Rules

Navigate to **Firewall → Rules → WAN**:

```text
# Rule 1: Allow IKEv2

Action:           Pass
Interface:        WAN
Direction:        in
TCP/IP Version:   IPv6
Protocol:         UDP
Source:           2001:db8:100::2/128
Destination:      WAN address
Destination port: 500 (ISAKMP)
Description:      Allow IKEv2 from remote gateway

# Rule 2: Allow NAT-T
(Same as above but port 4500)

# Rule 3: Allow ESP
Action:           Pass
Protocol:         ESP (50)
Source:           2001:db8:100::2/128
```

### IPsec Interface Rules

Navigate to **Firewall → Rules → IPsec**:

```text
Action:           Pass
Interface:        IPsec
TCP/IP Version:   IPv6
Protocol:         Any
Source:           2001:db8:2::/48
Destination:      2001:db8:1::/48
Description:      Allow tunnel traffic from Site2

```

## Monitoring from OPNsense UI

Navigate to **VPN → IPsec → Status Overview**:

```text
Active Tunnels:
  Connection        Remote Gateway         State
  IPv6-Site-To-Site 2001:db8:100::2        ESTABLISHED
  Child SAs:
    site1-to-site2  2001:db8:1::/48 ↔ 2001:db8:2::/48
    Bytes in: 45892    Bytes out: 38422
```

Click **Connect** to initiate the tunnel or **Disconnect** to terminate.

## CLI Verification (SSH)

OPNsense runs FreeBSD with strongSwan:

```bash
# SSH to OPNsense
ssh root@<opnsense-hostname-or-ip>

# Show strongSwan status
ipsec statusall

# List active SAs
swanctl --list-sas

# List active connections
swanctl --list-conns

# Initiate manually (use the CHILD name shown by swanctl --list-conns)
swanctl --initiate --child <child-name>

# Ping through tunnel
ping -6 -c 3 2001:db8:2::1

# View IPsec logs
tail -50 /var/logs/ipsec/latest.log

# tcpdump: Verify ESP or IKE/NAT-T on WAN
tcpdump -ni <wan-interface> 'ip6 proto 50 or udp port 500 or udp port 4500' -c 10
```

## Key Differences: OPNsense vs pfSense for IPv6 IPsec

| Feature | OPNsense | pfSense |
|---------|----------|---------|
| UI Location | VPN → IPsec → Tunnel Settings (legacy) or Connections (new) | VPN → IPsec → Tunnels |
| IKEv2 support | Yes | Yes |
| IPv6 support | Yes | Yes |
| Logging | VPN → IPsec → Log File + swanctl | Status → System Logs → IPsec |
| Plugin management | OPNsense plugins | pfSense packages |

## Routes After Tunnel Establishment

```bash
# For a standard policy-based Phase 1 / Phase 2 tunnel, OPNsense installs
# the matching kernel route/policy automatically.
route -n get -inet6 2001:db8:2::1

# Inspect the active security associations
swanctl --list-sas

# Static routes are typically only needed for route-based (VTI) IPsec setups.
```

## Summary

OPNsense IPv6 IPsec configuration in the legacy **Tunnel Settings** UI follows the same Phase 1/Phase 2 structure as pfSense. Set Internet Protocol to IPv6 in Phase 1, use AES-GCM-256 in Phase 2, and ensure firewall rules allow UDP 500, UDP 4500, and ESP from the remote gateway. Monitor from **VPN → IPsec → Status Overview** or via CLI with `swanctl --list-sas`. For a standard policy-based tunnel, OPNsense installs the matching kernel route/policy automatically. Use `swanctl --initiate --child <child-name>` from CLI if the tunnel doesn't auto-start.
