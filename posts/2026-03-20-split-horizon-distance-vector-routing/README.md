# How to Understand Split Horizon in Distance Vector Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, RIP, Distance Vector, Split Horizon, IPv4

Description: Understand the split horizon rule in distance vector routing protocols and how it prevents routing loops and count-to-infinity problems.

## Introduction

Split horizon is a loop-prevention mechanism used in distance vector routing protocols like RIP and EIGRP. The rule is simple: **do not advertise a route back out the interface through which it was learned.** This prevents two directly connected routers from creating a routing loop where each believes the other is the path to a destination.

## The Problem Split Horizon Solves

Without split horizon, consider Router A and Router B directly connected:

1. Router A learns network 10.1.0.0/24 from Router B
2. Router A advertises 10.1.0.0/24 back to Router B (without split horizon)
3. If the real 10.1.0.0/24 link goes down on Router B, B sees Router A still advertising it
4. Router B installs A's route: "10.1.0.0/24 via A, metric 2"
5. Router A installs B's route: "10.1.0.0/24 via B, metric 3"
6. They keep incrementing (count to infinity) until maximum hop count is reached

## Split Horizon Variants

**Simple split horizon**: Never advertise a route back out the interface it came in on.

**Split horizon with poison reverse**: Advertise the route back, but with an infinite metric (16 in RIP). This is more aggressive and converges faster.

## Observing Split Horizon in RIP (Linux/FRR)

```bash
# Configure RIP with FRR

# /etc/frr/frr.conf

router rip
  network 192.168.1.0/24
  network 10.0.0.0/8
  # split-horizon is enabled by default in FRR RIP

# To disable split horizon on an interface (not recommended)
interface eth0
  no ip rip split-horizon

# To enable poison reverse
interface eth0
  ip rip split-horizon poisoned-reverse
```

## Verifying Split Horizon Behavior

```bash
# Check RIP database on FRR
vtysh -c "show ip rip"

# Enable packet debugging to see RIP updates being sent and received
vtysh -c "debug rip packet"

# Check RIP status and peer information
vtysh -c "show ip rip status"
```

## When Split Horizon Causes Problems

Split horizon can prevent valid route advertisements in **hub-and-spoke topologies** over NBMA (non-broadcast multi-access) networks:

```text
Spoke A ----\
              Hub Router --- Backbone
Spoke B ----/
```

If Spoke A and Spoke B connect to a Hub router via a single NBMA interface, the Hub learns Spoke A's network from that interface. Split horizon prevents the Hub from advertising Spoke A's routes to Spoke B (same interface). This breaks spoke-to-spoke communication.

Fix: disable split horizon on the hub's NBMA interface:

```bash
# Disable split horizon on the hub's NBMA interface only
interface eth0
  no ip rip split-horizon
```

## Split Horizon vs Poison Reverse

| Feature | Split Horizon | Poison Reverse |
|---|---|---|
| Mechanism | Don't re-advertise | Re-advertise with metric 16 |
| Bandwidth usage | Lower | Slightly higher |
| Convergence speed | Slower | Faster |
| Loop prevention | Good | Better |

## Conclusion

Split horizon is a fundamental stability mechanism in distance vector protocols. It stops routing loops before they start by preventing routes from being advertised back toward their source. For most topologies it should remain enabled; only disable it on hub interfaces in NBMA topologies where full mesh reachability is required.
