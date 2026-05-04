# How to Configure IPv6 Multicast Rendezvous Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, PIM-SM, Rendezvous Point, Multicast, Network Routing

Description: A guide to configuring and managing IPv6 multicast Rendezvous Points (RP) for PIM-SM deployments, including static, BSR, and Anycast RP configurations.

## What Is a Rendezvous Point?

The Rendezvous Point (RP) is a router in a PIM-SM network where multicast sources register and receivers initially join. All multicast traffic flows through the RP until routers can switch to a direct source tree. For IPv6 multicast, the RP must have a global IPv6 address.

## Static RP Configuration

Static RP is the simplest approach - all routers are manually configured with the RP address:

```bash
# On all PIM routers in the domain (FRR vtysh)

vtysh
configure terminal

# Static RP is configured inside the router pim6 context in current FRR
router pim6
 # Define the RP address for a specific multicast group prefix
 rp 2001:db8::1 ff3e::/32

 # Or configure the RP for all IPv6 multicast groups (omit the prefix)
 rp 2001:db8::1
exit

# On the RP router itself, also bind the RP address to a loopback
interface lo
 ipv6 address 2001:db8::1/128
 ipv6 pim
exit

end
write memory
```

## BSR (Bootstrap Router) for Dynamic RP

BSR (Bootstrap Router) protocol automatically distributes RP information to all PIM routers, eliminating the need for static configuration:

```bash
# On the BSR candidate router
vtysh
configure terminal

# BSR commands live inside the router pim6 context in current FRR
router pim6
 # Configure this router as a BSR candidate (the source IPv6 must be on a
 # local interface; use "source address ..." or "source loopback")
 bsr candidate-bsr priority 100 source address 2001:db8::1

 # Configure this router as an RP candidate; the source is set the same way
 bsr candidate-rp priority 10 source address 2001:db8::1
 # Group ranges this candidate-RP advertises are added with separate
 # "bsr candidate-rp group ..." lines (one per range)
 bsr candidate-rp group ff3e::/32

 # On a backup BSR router, use a higher priority to win election
 # (BSR election picks the highest priority; lower = less preferred)
 # bsr candidate-bsr priority 50 source address 2001:db8::2
exit

end
write memory
```

## Embedded RP (RFC 3956)

IPv6 has a unique feature called Embedded RP, where the RP address is embedded in the multicast group address itself. This eliminates the need for BSR or static RP configuration.

An embedded RP group address looks like (per RFC 3956):
```text
ff7<scope>:0<RIID><plen>:<RP network prefix, 64 bits>:<group ID, 32 bits>
```

Where the second 16 bits encode a reserved nibble (0), the 4-bit RIID, and the
8-bit prefix length, and the RP address is reconstructed by taking the first
`plen` bits of the prefix field, zeroing the rest, and copying the RIID into
the lowest 4 bits.

Example:
```text
RP address: 2001:db8:1::1
Embedded RP group: ff7e:0140:2001:db8:1::1:beef
```

```bash
# FRR: enable embedded RP support
vtysh
configure terminal

# Embedded RP is enabled inside the router pim6 context
router pim6
 embedded-rp
exit

end
write memory

# Verify embedded RP is working
vtysh -c "show ipv6 pim rp-info"
```

## Anycast RP

For redundancy, multiple routers can share the same RP address (Anycast RP). When one RP fails, routing automatically shifts to the nearest surviving RP:

```bash
# Configure the same RP address on multiple routers
# RP Router 1
interface lo
 ipv6 address 2001:db8::1/128  # shared anycast address

# RP Router 2 (different physical router, same anycast address)
interface lo
 ipv6 address 2001:db8::1/128  # same anycast address

# Advertise the RP /128 via OSPFv3, IS-IS, or BGP so the IGP picks the nearest
# instance for any given PIM router. Configure the same static RP (or BSR
# candidate-RP) for 2001:db8::1 on every PIM router in the domain.

# Source synchronization between Anycast-RP peers in IPv6 is done with
# RFC 4610 "Anycast-RP using PIM" (PIM forwards Register messages to the
# other RPs in the anycast set). MSDP (RFC 3618) is IPv4-only and is NOT
# used for IPv6, and FRR does not provide a "router msdp" mode for v6.
# In FRR's pim6d, basic anycast RP works via the shared loopback address
# plus identical RP config on all routers; RFC 4610 register-set forwarding
# is not currently exposed as a separate FRR knob.
```

## Verifying RP Configuration

```bash
# Check RP information on all PIM routers (static + embedded + BSR-learned)
vtysh -c "show ipv6 pim rp-info"
# Expected:
# RP: 2001:db8::1 Group: ff3e::/32 ...

# Check BSR state on all routers
vtysh -c "show ipv6 pim bsr"

# On a candidate-BSR / candidate-RP router, see what is being advertised
vtysh -c "show ipv6 pim bsr candidate-bsr"
vtysh -c "show ipv6 pim bsr candidate-rp"

# Inspect BSR-learned group-to-RP mappings
vtysh -c "show ipv6 pim bsr rp-info"

# Inspect (S,G) state at the RP — source registrations show up here
vtysh -c "show ipv6 pim upstream"
```

## Testing RP with a Multicast Stream

```bash
# Source sends to a group in the RP's range
python3 -c "
import socket, time
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_MULTICAST_HOPS, 64)
for i in range(10):
    s.sendto(f'test {i}'.encode(), ('ff3e::1234', 5000))
    time.sleep(1)
"

# Check that the RP sees the registration
vtysh -c "show ipv6 pim upstream"
# Look for an (S,G) entry such as (2001:db8::100, ff3e::1234)
```

## Summary

IPv6 multicast RPs can be configured statically (`rp <addr>` inside `router pim6`), dynamically via BSR, or using IPv6's unique Embedded RP feature where the RP is encoded in the multicast address. For redundancy, use Anycast RP where multiple routers share the same RP address — and remember that on IPv6 you use RFC 4610 (Anycast-RP using PIM), not MSDP. Always verify RP configuration with `show ipv6 pim rp-info` and test with actual multicast sources and receivers.
