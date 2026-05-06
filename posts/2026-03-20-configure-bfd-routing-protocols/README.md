# How to Configure Bidirectional Forwarding Detection (BFD) with Routing Protocols

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BFD, Networking, Routing, OSPF, BGP, FRR, Failover

Description: Configure Bidirectional Forwarding Detection (BFD) to enable sub-second failure detection for OSPF and BGP sessions, enabling faster routing convergence.

## Introduction

BFD is a lightweight protocol that detects link or path failures between two forwarding engines in milliseconds - far faster than OSPF's default dead interval (40 seconds) or BGP's default hold timer. BFD operates independently of the routing protocol and notifies it immediately when a path fails.

## How BFD Works

BFD creates a control session between two endpoints. Both send BFD control packets at a configured interval (e.g., every 300ms). If packets are missed for a configured multiplier (e.g., 3), the session is declared down and the routing protocol is notified immediately.

## Installing and Enabling BFD in FRR

```bash
# Enable the BFD daemon in FRR

sed -i 's/bfdd=no/bfdd=yes/' /etc/frr/daemons
systemctl restart frr

# Verify BFD daemon is running
vtysh -c "show bfd peers"
```

## Configuring BFD with OSPF

```bash
# /etc/frr/frr.conf

# Configure BFD profile with timing parameters
bfd
  profile FAST-DETECT
    receive-interval 300    # ms between received BFD packets
    transmit-interval 300   # ms between sent BFD packets
    detect-multiplier 3     # miss 3 packets = failure (900ms detection)

# Apply BFD to OSPF interface
interface eth0
  ip ospf bfd
  # Uses default BFD parameters

# Or use a named profile
interface eth0
  ip ospf bfd profile FAST-DETECT
```

## Configuring BFD with BGP

```bash
# /etc/frr/frr.conf

router bgp 65001
  neighbor 10.0.0.2 bfd
  # BFD now monitors the BGP session to 10.0.0.2

# Or use a specific profile for tighter timing
router bgp 65001
  neighbor 10.0.0.2 bfd profile FAST-DETECT
```

## Verifying BFD Sessions

```bash
# Show all BFD peers and their state
vtysh -c "show bfd peers"

# Show detailed BFD session info for one peer
vtysh -c "show bfd peer 10.0.0.2"

# Expected output for a healthy session:
# BFD Peer:
#     peer 10.0.0.2
#       ID: 1
#       Remote ID: 1
#       Status: up
#       Uptime: 1 day(s), 2 hour(s), 5 minute(s)
#       Diagnostics: ok
#       Remote diagnostics: ok
#       Peer Type: dynamic
#       Local timers:
#         Detect-multiplier: 3
#         Receive interval: 300 ms
#         Transmission interval: 300 ms
#         Echo receive interval: 50 ms
#         Echo transmission interval: disabled
#       Remote timers:
#         Detect-multiplier: 3
#         Receive interval: 300 ms
#         Transmission interval: 300 ms
#         Echo receive interval: 50 ms
```

## Testing BFD Failover

```bash
# Simulate link failure by shutting down the interface
ip link set eth0 down

# On directly connected peers, the kernel may report interface-down before BFD expires.
# To validate BFD timing specifically, test a path failure where the interface stays up.
# Watch for BGP/OSPF convergence
watch -n 0.5 "vtysh -c 'show ip bgp summary' | grep -E 'Neighbor|10.0.0'"
```

## Conclusion

BFD dramatically reduces routing convergence time from tens of seconds to under one second. It's especially valuable in scenarios where physical link-down detection is slow (e.g., fiber through a patch panel, or virtual networks). Configure BFD alongside OSPF and BGP in any network where fast failover is a requirement.
