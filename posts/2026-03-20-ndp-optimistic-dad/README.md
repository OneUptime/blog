# How to Use Optimistic DAD for IPv6 Address Assignment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NDP, DAD, Optimistic DAD, RFC 4429, Networking

Description: Understand and configure Optimistic Duplicate Address Detection (DAD) to reduce address assignment latency while maintaining duplicate detection safety.

## Standard DAD vs Optimistic DAD

**Standard DAD (RFC 4862):**
- Address is "tentative" for ~1 second while waiting for NS responses
- Cannot use address for communication during tentative state
- Adds 1-2 second delay to address configuration

**Optimistic DAD (RFC 4429):**
- Address is "optimistic" and can be used immediately for most traffic
- Treated as deprecated for source address selection until DAD completes
- Must not be used as the source of NS messages or update neighbor caches (NA Override flag is forced to 0)
- Still detects duplicates via NS/NA exchange
- Reduces connectivity delay from ~1s to ~50ms

## Enabling Optimistic DAD on Linux

```bash
# Enable Optimistic DAD per interface

sysctl -w net.ipv6.conf.eth0.optimistic_dad=1

# Enable globally
sysctl -w net.ipv6.conf.all.optimistic_dad=1

# Persist in sysctl.conf
echo "net.ipv6.conf.all.optimistic_dad = 1" >> /etc/sysctl.d/99-ipv6-dad.conf
sysctl -p /etc/sysctl.d/99-ipv6-dad.conf

# Verify
sysctl net.ipv6.conf.eth0.optimistic_dad
```

## Observing Optimistic DAD Behavior

```bash
# Configure an address and watch state transitions
ip -6 addr add 2001:db8::1/64 dev eth0

# Without optimistic: state = tentative (cannot use)
# With optimistic: state = optimistic (usable, but deprecated for source selection)

# Check address state
ip -6 addr show dev eth0
# tentative: standard DAD in progress
# optimistic: RFC 4429 DAD in progress
# dadfailed: DAD detected a duplicate
# deprecated: address valid but prefer newer addresses
# (no flag printed): address is in the preferred state

# Time the state transition
time bash -c 'ip -6 addr add 2001:db8::10/64 dev eth0; \
    while ip -6 addr show dev eth0 | grep -q optimistic; do sleep 0.01; done; \
    echo "Ready"'
```

## Optimistic DAD Conflict Detection

```bash
# Simulate a DAD conflict
# Add address on eth0
ip -6 addr add 2001:db8::1/64 dev eth0

# Simultaneously add same address on another interface (conflict!)
ip netns exec other-ns ip -6 addr add 2001:db8::1/64 dev veth0

# Observe conflict resolution
ip monitor dev eth0  # Watch for DAD failure events

# Kernel log shows conflict
dmesg | grep "IPv6 duplicate address"
# Example: eth0: IPv6 duplicate address 2001:db8::1 used by aa:bb:cc:dd:ee:ff detected!
```

## Optimistic DAD for Mobile/Roaming Scenarios

Optimistic DAD benefits mobile clients attaching to new networks:

```bash
#!/bin/bash
# Simulate mobile attachment with Optimistic DAD measurement

IFACE="wlan0"

echo "Attaching to network..."
ip link set ${IFACE} up

# Measure time from address assignment to first packet
START=$(date +%s%N)

ip -6 addr add 2001:db8::abcd/64 dev ${IFACE}

# Wait for optimistic state (not tentative)
while ! ip -6 addr show dev ${IFACE} | grep -qE "optimistic|preferred"; do
    sleep 0.005
done

READY=$(date +%s%N)
DELAY_MS=$(( (READY - START) / 1000000 ))
echo "Address usable after: ${DELAY_MS}ms"

# With standard DAD, this is typically 1000-2000ms
# With Optimistic DAD, typically 10-50ms
```

## Kernel Parameters Reference

```bash
# Optimistic DAD settings
sysctl net.ipv6.conf.all.optimistic_dad          # 0=off, 1=on (default 0)
sysctl net.ipv6.conf.eth0.use_optimistic         # Allow optimistic addresses to be picked for source address selection (do not treat as deprecated)

# Standard DAD tuning
sysctl net.ipv6.conf.eth0.dad_transmits          # NS sent during DAD (default 1)
sysctl net.ipv6.conf.eth0.accept_dad             # 0=off, 1=on (default), 2=on+disable IPv6 if MAC-based link-local conflict

# Retransmit timer (per-interface neigh table)
sysctl net.ipv6.neigh.eth0.retrans_time_ms       # DAD NS retransmit interval (default 1000ms)
```

## Conclusion

Optimistic DAD (RFC 4429) reduces IPv6 address configuration latency from ~1 second to ~50ms by allowing immediate use of the address (for sending) while DAD completes. It is particularly valuable for mobile clients, VMs spinning up, or any scenario where fast network connectivity matters. Enable with `net.ipv6.conf.all.optimistic_dad=1`. The trade-off is a brief window where sent traffic may not be received if the address is duplicated, but the DAD mechanism still detects and resolves conflicts.
