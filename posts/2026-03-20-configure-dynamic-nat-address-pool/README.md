# How to Configure Dynamic NAT with an Address Pool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, IPv4, Cisco, Linux

Description: Learn how to configure dynamic NAT using a pool of public IP addresses to translate multiple private IP hosts.

## What Is Dynamic NAT?

Dynamic NAT translates private IP addresses to a pool of public IP addresses. Unlike static NAT (fixed 1:1), dynamic NAT assigns pool addresses on demand. When the pool is exhausted, new hosts that need a fresh translation cannot be translated until an existing binding ages out.

**Key difference from PAT**: Dynamic NAT is one-to-one (one private host → one public IP at a time), but the mapping is not fixed. PAT maps many private IPs to one public IP using port numbers.

## Configuring Dynamic NAT on Cisco IOS

```cisco
! Step 1: Define the pool of public IPs
ip nat pool PUBLIC_POOL 203.0.113.10 203.0.113.20 netmask 255.255.255.0

! Step 2: Create ACL to match private IPs to translate
access-list 10 permit 192.168.1.0 0.0.0.255

! Step 3: Enable dynamic NAT
ip nat inside source list 10 pool PUBLIC_POOL

! Step 4: Mark interfaces
interface GigabitEthernet0/0
 ip nat inside

interface GigabitEthernet0/1
 ip nat outside
```

### Pool with Rotary Option

`type rotary` is not used for standard inside-source dynamic NAT. On Cisco IOS, a rotary pool is used with `ip nat inside destination` for TCP load distribution to a pool of real inside hosts.

## Verifying Dynamic NAT on Cisco

```cisco
! View active NAT translations
show ip nat translations

! View statistics (hits, misses, expired)
show ip nat statistics

! Clear the translation table
clear ip nat translation *
```

Sample output:

```text
Pro Inside global      Inside local       Outside local      Outside global
tcp 203.0.113.10:1024  192.168.1.10:1024  8.8.8.8:80         8.8.8.8:80
tcp 203.0.113.11:1025  192.168.1.20:1025  1.1.1.1:443        1.1.1.1:443
```

## Configuring Dynamic NAT on Linux with iptables

Unlike Cisco's named pools, Linux NAT can use IP ranges:

```bash
# Translate 192.168.1.0/24 → pool of 203.0.113.10-203.0.113.20

iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 \
    -j SNAT --to-source 203.0.113.10-203.0.113.20
```

Linux selects the least-used address in the range for new connections, which provides primitive load balancing. Source ports are preserved when possible and remapped only if needed.

## Dynamic NAT vs PAT Comparison

| Feature | Dynamic NAT | PAT (NAT Overload) |
|---------|-------------|-------------------|
| IP pool | Required (one or more IPs) | Single IP sufficient |
| Port translation | No | Yes |
| Concurrent translated hosts | Limited by pool size | Many hosts can share one IP |
| Use case | Outbound clients needing temporary 1:1 public IPs | Home/office internet sharing |

## Key Takeaways

- Dynamic NAT assigns pool addresses on demand; no fixed mappings.
- The pool must have enough IPs to support concurrent translated hosts.
- When the pool is exhausted, new hosts that need a fresh translation cannot be translated until a binding ages out; PAT scales better because many hosts can share one public IP.
- On Linux, `--to-source IP1-IP2` specifies an IP range for SNAT.

**Related Reading:**

- [How to Configure Static NAT on a Router](https://oneuptime.com/blog/post/2026-03-20-configure-static-nat-router/view)
- [How to Configure PAT (Port Address Translation)](https://oneuptime.com/blog/post/2026-03-20-configure-pat-nat-overload/view)
- [How to Troubleshoot NAT Translation Issues](https://oneuptime.com/blog/post/2026-03-20-troubleshoot-nat-translation/view)
