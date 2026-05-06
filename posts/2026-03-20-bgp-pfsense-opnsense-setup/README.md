# How to Set Up BGP on pfSense or OPNsense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, pfSense, OPNsense, FRR, Routing, IPv4, Networking, Firewall

Description: Learn how to configure BGP on pfSense or OPNsense using the FRR package to peer with upstream routers and advertise IPv4 prefixes.

---

pfSense and OPNsense can run FRR (Free Range Routing) to add dynamic routing capabilities including BGP. This is useful for small data centers, home labs, or ISP edge routers that need BGP peering.

## Installing FRR on pfSense

```text
System → Package Manager → Available Packages
Search: "frr" → Install "FRR"
```

On OPNsense:
```text
System → Firmware → Plugins
Search: "os-frr" → Install
```

## Accessing FRR Configuration

### pfSense
`Services → FRR Global/Zebra` (global FRR settings and Zebra)
`Services → FRR BGP` (BGP-specific config)

### OPNsense
`Routing → General` (enable FRR globally)
`Routing → BGP` (BGP-specific config)

## BGP Configuration via Web UI

### Global Settings

```text
pfSense FRR Global/Zebra:
  Enable: ✓
  Default Router ID: 10.0.0.1 (unique local IPv4 address, often LAN or loopback)

OPNsense Routing → General:
  Enable: ✓
  Log Level: notifications (default)
```

### BGP Configuration

```text
BGP Router ID: 10.0.0.1  (unique local IPv4 address)
AS Number: 65001
Networks to Advertise: 192.168.1.0/24  (must exist in the routing table unless Network Import-Check is disabled)
```

### Adding a BGP Neighbor

```text
Neighbor IP: 10.0.0.2     (upstream router's IPv4)
Remote AS: 65100          (upstream router's ASN)
Description: Upstream ISP

Update Source: set only when sourcing the session from a specific interface or loopback
```

On current pfSense FRR packages, create a route map such as `ALLOW-ALL` under `Services → FRR Global/Zebra → Route Maps` and apply it inbound and outbound to the neighbor, or routes will not be exchanged.

## Raw FRR Configuration (via SSH)

For advanced settings, use `vtysh` and the platform's raw FRR workflow instead of hand-editing package-managed configuration files.

```bash
# Access FRR CLI

vtysh

# Show current BGP summary
show bgp ipv4 unicast summary
show bgp ipv4 unicast
```

```nginx
# Example integrated FRR configuration
!
frr defaults traditional
!
route-map ALLOW-ALL permit 100
!
router bgp 65001
 bgp router-id 10.0.0.1
 !
 neighbor 10.0.0.2 remote-as 65100
 neighbor 10.0.0.2 description "Upstream Router"
 !
 address-family ipv4 unicast
  network 192.168.1.0/24
  neighbor 10.0.0.2 activate
  neighbor 10.0.0.2 route-map ALLOW-ALL in
  neighbor 10.0.0.2 route-map ALLOW-ALL out
  neighbor 10.0.0.2 soft-reconfiguration inbound
 exit-address-family
!
```

## Verifying the BGP Session

```bash
# In vtysh (via SSH to pfSense/OPNsense)
vtysh -c "show bgp ipv4 unicast summary"

# Expected output when peer is established:
# Neighbor        V         AS MsgRcvd MsgSent   Up/Down  State/PfxRcd
# 10.0.0.2        4      65100      45      42 00:10:30        5

# If State/PfxRcd shows (Policy), the peer is up but inbound/outbound filters are missing.

# Show received prefixes
vtysh -c "show bgp ipv4 unicast neighbors 10.0.0.2 received-routes"
```

## Firewall Rules for BGP

BGP uses TCP port 179. Ensure firewall rules allow BGP traffic.

```text
pfSense: Firewall → Rules → <peering interface>
Add rule: Protocol=TCP, Destination=<interface address>, Destination Port=179, Action=Pass

OPNsense: Firewall → Rules → <peering interface>
Allow inbound TCP/179 to the local peering address, unless you enable auto-created FRR firewall rules in Routing → General
```

## Key Takeaways

- Install the FRR package on pfSense or OPNsense to enable BGP; configure via the web UI or `vtysh`.
- Set the Router ID to a unique local IPv4 address, often a loopback or LAN-side IP.
- On current pfSense FRR packages, eBGP neighbors need inbound and outbound filters or route maps before routes will be exchanged.
- Use `network` statements to advertise your IPv4 prefixes; by default, the prefix must exist in the routing table.
- Allow TCP port 179 on the interface used for peering; OPNsense can also auto-create FRR firewall rules.
