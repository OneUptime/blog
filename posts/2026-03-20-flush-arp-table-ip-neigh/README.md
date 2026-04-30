# How to Flush the ARP Table with ip neigh flush

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, ARP, Networking, Troubleshooting

Description: Flush and clear the ARP table on Linux using ip neigh flush to force ARP re-resolution, useful for troubleshooting stale entries and IP change scenarios.

## Introduction

Flushing the ARP table forces the kernel to re-resolve MAC addresses as traffic resumes. This is needed when IP-to-MAC mappings have changed (e.g., a NIC was replaced, a VM migrated, or ARP poisoning occurred). Run the flush commands as root or with `sudo`. By default, `ip neigh flush` removes dynamic entries while preserving `permanent` and `noarp` ones.

## Flush All Dynamic Neighbor Entries

```bash
# Flush dynamic neighbor entries across all prefixes

ip neigh flush to all

# Verify the cache is mostly empty
ip neigh show
```

## Flush Neighbor Table for a Specific Interface

```bash
# Flush only eth0's neighbor entries
ip neigh flush dev eth0
```

## Flush Only Stale Entries

```bash
# Remove only stale entries
ip neigh flush nud stale

# Remove failed entries
ip neigh flush nud failed
```

## Flush and Verify

```bash
# Before flush - see current entries
ip neigh show

# Flush
ip neigh flush dev eth0

# After flush - most entries removed
ip neigh show

# Generate new ARP entries by pinging
ping -c 1 192.168.1.1
ip neigh show to 192.168.1.1
```

## Flush IPv4 ARP Only

```bash
# Flush only IPv4 neighbor entries
ip -4 neigh flush dev eth0
```

## Flush All Flushable Entries, Including Permanent Ones (Use Caution)

```bash
# Delete all flushable entries, including permanent ones
ip neigh flush nud all

# This includes static entries, but not noarp entries
```

## When to Flush the ARP Cache

- After changing a network interface card (MAC address changed)
- After migrating a VM to a different host
- When a device changed its IP without ARP announcement
- When troubleshooting "IP address already in use" errors
- After detecting ARP poisoning/spoofing

## Flush ARP on Remote Hosts Simultaneously

```bash
# If multiple hosts have stale ARP entries
# Use a loop to flush on all servers via SSH
for host in server1 server2 server3; do
    ssh $host "ip neigh flush dev eth0"
done
```

## Difference from Delete

```bash
# ip neigh flush - removes all matching entries at once
ip neigh flush dev eth0

# ip neigh del - removes a specific single entry
ip neigh del 192.168.1.50 dev eth0
```

## Conclusion

`ip neigh flush dev <interface>` clears dynamic neighbor entries for an interface, forcing re-resolution. Use `nud stale` or `nud failed` to flush only specific states. Permanent entries survive the default flush; use `nud all` to include them. `noarp` entries are still excluded. After flushing, new ARP entries are populated as traffic flows.
