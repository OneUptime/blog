# How to Clear the ARP Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, Linux, Window, macOS

Description: Learn how to clear the ARP cache on Linux, Windows, and macOS to resolve stale or incorrect ARP entries.

## Why Clear the ARP Cache?

You may need to clear the ARP cache when:
- A device's MAC address changed (hardware replacement)
- You're troubleshooting connectivity issues caused by stale entries
- You want to force fresh ARP resolution
- An IP address was reassigned to a new device

## Clearing ARP Cache on Linux

### Delete All Entries

```bash
# Flush ARP cache entries on eth0 (replace with your interface)

ip -4 neigh flush dev eth0

# Flush all ARP entries on all interfaces
ip -4 neigh flush nud all

# Flush only failed entries
ip -4 neigh flush nud failed

# Flush stale entries
ip -4 neigh flush nud stale
```

### Delete a Specific Entry

```bash
# Remove a specific ARP entry
ip -4 neigh del 192.168.1.20 dev eth0
```

### Verify the Flush

```bash
ip -4 neigh show
# Flushed entries should be gone, but active traffic can repopulate the table immediately
```

### Using the Legacy `arp` Command

```bash
# Delete a specific entry
arp -d 192.168.1.20

# Delete on a specific interface
arp -d 192.168.1.20 -i eth0
```

## Clearing ARP Cache on Windows

### Command Prompt

```cmd
REM Delete all ARP entries
netsh interface ipv4 delete arpcache

REM Alternative using arp command
arp -d *
```

### PowerShell

```powershell
# Remove all IPv4 neighbor entries (ARP entries)
Remove-NetNeighbor -AddressFamily IPv4 -Confirm:$false

# Remove IPv4 neighbor entries for a specific interface
Remove-NetNeighbor -InterfaceAlias 'Ethernet' -AddressFamily IPv4 -Confirm:$false

# Remove a specific IP entry
Remove-NetNeighbor -IPAddress 192.168.1.20 -AddressFamily IPv4 -Confirm:$false
```

## Clearing ARP Cache on macOS

```bash
# Clear entire ARP cache (requires sudo)
sudo arp -d -a

# Delete a specific entry
sudo arp -d 192.168.1.20

# Clear all entries on a specific interface
sudo arp -d -i en0 -a
```

## Script: Clear ARP Cache and Re-Ping

```bash
#!/bin/bash
# Clear ARP cache and force re-resolution for an on-link host
TARGET="192.168.1.1"
IFACE="eth0"

echo "Removing ARP entry for $TARGET..."
ip -4 neigh del "$TARGET" dev "$IFACE" 2>/dev/null

echo "Pinging $TARGET to trigger fresh ARP..."
ping -c 1 "$TARGET" > /dev/null 2>&1

echo "New ARP entry:"
ip -4 neigh show "$TARGET"
```

## When ARP Cache Clears Automatically

ARP entries do not persist forever. On Linux:
- REACHABLE entries are considered valid for a randomized interval around 30 seconds by default
- `gc_stale_time` defaults to 60 seconds and controls how often Linux checks for stale neighbor entries

Check the current timeouts:

```bash
sysctl net.ipv4.neigh.default.base_reachable_time_ms
sysctl net.ipv4.neigh.default.gc_stale_time
```

## Key Takeaways

- `ip -4 neigh flush dev eth0` is the modern way to clear ARP on Linux.
- Windows uses `netsh interface ipv4 delete arpcache` or PowerShell's `Remove-NetNeighbor -AddressFamily IPv4`.
- macOS uses `sudo arp -d -a` to flush all entries.
- Clearing ARP cache forces fresh resolution and can fix stale-mapping issues.

**Related Reading:**

- [How to View the ARP Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-arp-table-linux/view)
- [How to Add Static ARP Entries](https://oneuptime.com/blog/post/2026-03-20-add-static-arp-entry-ip-neigh/view)
- [How to Set ARP Cache Timeouts on Linux](https://oneuptime.com/blog/post/2026-03-20-set-arp-cache-timeouts-linux/view)
