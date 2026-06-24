# How to Configure IPsec IPv6 on Juniper Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, Juniper, Junos, VPN

Description: Learn how to configure IPv6 IPsec site-to-site VPNs on Juniper routers using JunOS, including IKEv2 policy, security associations, and route-based VPN configuration.

## Overview

On Juniper SRX devices, Junos OS supports IPv6 IPsec using IKEv2 with route-based VPN configuration. Route-based VPNs use a secure tunnel interface (st0) that behaves like a regular interface, making routing straightforward. Junos OS IPv6 IPsec configuration follows the same pattern as IPv4, but the IKE gateway and local-address values use IPv6 addresses.

## Full IPv6 IPsec Configuration

### IKEv2 Proposal and Policy

```text
# IKEv2 Proposal (cipher suites)

set security ike proposal IKEv2-PROP authentication-method pre-shared-keys
set security ike proposal IKEv2-PROP dh-group group14
set security ike proposal IKEv2-PROP authentication-algorithm sha-256
set security ike proposal IKEv2-PROP encryption-algorithm aes-256-cbc
set security ike proposal IKEv2-PROP lifetime-seconds 28800

# IKEv2 Policy
set security ike policy IKEv2-POLICY mode main
set security ike policy IKEv2-POLICY proposals IKEv2-PROP
set security ike policy IKEv2-POLICY pre-shared-key ascii-text "StrongSharedKey123!"

# IKEv2 Gateway (remote peer)
set security ike gateway IPV6-GATEWAY ike-policy IKEv2-POLICY
set security ike gateway IPV6-GATEWAY address 2001:db8:0:2::1
set security ike gateway IPV6-GATEWAY external-interface ge-0/0/0.0
set security ike gateway IPV6-GATEWAY local-address 2001:db8:0:1::1
set security ike gateway IPV6-GATEWAY version v2-only
set security ike gateway IPV6-GATEWAY local-identity inet6 2001:db8:0:1::1
set security ike gateway IPV6-GATEWAY remote-identity inet6 2001:db8:0:2::1
```

### IPsec Proposal and Policy

```text
# IPsec Proposal (ESP transform)
set security ipsec proposal ESP-PROP protocol esp
set security ipsec proposal ESP-PROP authentication-algorithm hmac-sha-256-128
set security ipsec proposal ESP-PROP encryption-algorithm aes-256-cbc
set security ipsec proposal ESP-PROP lifetime-seconds 3600

# IPsec Policy
set security ipsec policy IPSEC-POLICY proposals ESP-PROP

# IPsec VPN
set security ipsec vpn IPV6-VPN bind-interface st0.0
set security ipsec vpn IPV6-VPN ike gateway IPV6-GATEWAY
set security ipsec vpn IPV6-VPN ike ipsec-policy IPSEC-POLICY
set security ipsec vpn IPV6-VPN establish-tunnels immediately
```

### Secure Tunnel Interface (st0)

```text
# Create and configure the tunnel interface
set interfaces st0 unit 0 family inet6 address 2001:db8:100:1::1/64
set interfaces st0 unit 0 description "IPv6 VPN to Site2"

# Route Site2 traffic through the tunnel
set routing-options rib inet6.0 static route 2001:db8:2::/48 next-hop st0.0
```

### Security Zones and Policies

```text
# Bind local LAN and tunnel interfaces to security zones, and allow IKE on the external interface
set security zones security-zone INTERNAL interfaces ge-0/0/1.0
set security zones security-zone UNTRUST interfaces ge-0/0/0.0 host-inbound-traffic system-services ike
set security zones security-zone VPN interfaces st0.0

# Allow traffic from local network to VPN zone
set security policies from-zone INTERNAL to-zone VPN policy ALLOW-TO-SITE2 match source-address site1-network
set security policies from-zone INTERNAL to-zone VPN policy ALLOW-TO-SITE2 match destination-address site2-network
set security policies from-zone INTERNAL to-zone VPN policy ALLOW-TO-SITE2 match application any
set security policies from-zone INTERNAL to-zone VPN policy ALLOW-TO-SITE2 then permit

# Reverse direction
set security policies from-zone VPN to-zone INTERNAL policy ALLOW-FROM-SITE2 match source-address site2-network
set security policies from-zone VPN to-zone INTERNAL policy ALLOW-FROM-SITE2 match destination-address site1-network
set security policies from-zone VPN to-zone INTERNAL policy ALLOW-FROM-SITE2 match application any
set security policies from-zone VPN to-zone INTERNAL policy ALLOW-FROM-SITE2 then permit

# Address book entries
set security address-book global address site1-network 2001:db8:1::/48
set security address-book global address site2-network 2001:db8:2::/48
```

## AES-GCM (AEAD) Configuration

```text
# Use AES-GCM for better performance (single-pass auth+encryption)
set security ipsec proposal ESP-GCM-PROP protocol esp
set security ipsec proposal ESP-GCM-PROP encryption-algorithm aes-256-gcm
set security ipsec proposal ESP-GCM-PROP lifetime-seconds 3600

# Note: With GCM, no separate authentication-algorithm needed
```

## Verification Commands

```text
# Show IKEv2 security associations
show security ike security-associations

# Sample output:
# Index   State  Initiator cookie  Responder cookie  Mode   Remote Address
# 1       UP     a1b2c3d4e5f60718  8877665544332211  IKEv2  2001:db8:0:2::1

# Show IPsec security associations
show security ipsec security-associations

# Sample output:
# Total active tunnels: 1
# ID    Algorithm                          SPI       Life:sec/kb  Mon  lsys  Port  Gateway
# <1>   ESP:aes-256-cbc/hmac-sha-256-128  abc12345  3558/unlim   -    root  500   2001:db8:0:2::1

# Show VPN statistics
show security ipsec statistics

# Show IPsec SA detail
show security ipsec security-associations detail

# Test connectivity from the INTERNAL-zone interface
ping inet6 2001:db8:2::1 interface ge-0/0/1.0 count 5
```

## Troubleshooting

```text
# Clear and re-establish
clear security ike security-associations
clear security ipsec security-associations

# Debug IKEv2 negotiation
set security ike traceoptions file ike-debug.log
set security ike traceoptions flag all

# View debug log
show log ike-debug.log

# Common issues:
# "IKE SA not found" → policy or address mismatch
# "Proposal not accepted" → cipher mismatch between peers
# Check with: show security ike stats
```

## Summary

Juniper IPv6 IPsec uses a three-tier configuration: IKEv2 proposal/policy/gateway for IKE, IPsec proposal/policy/VPN for ESP, and a secure tunnel interface (st0) for routing. Route-based VPN binds the IPsec VPN to st0, and static or dynamic routes direct site-to-site traffic through it. Security zone policies control which traffic flows between zones. Use `show security ike security-associations` and `show security ipsec security-associations` to verify tunnel status. Use `establish-tunnels immediately` to initiate the tunnel on commit rather than waiting for traffic.
