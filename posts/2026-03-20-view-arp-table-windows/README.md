# How to View the ARP Table on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Window, ARP, IPv4

Description: Learn how to view and interpret the ARP cache on Windows using arp -a and PowerShell commands.

## Viewing the ARP Cache with `arp -a`

The quickest way to display the ARP table on Windows is via Command Prompt:

```cmd
arp -a
```

Sample output:

```yaml
Interface: 192.168.1.100 --- 0x4
  Internet Address      Physical Address      Type
  192.168.1.1           aa-bb-cc-dd-ee-ff     dynamic
  192.168.1.20          00-11-22-33-44-55     dynamic
  192.168.1.255         ff-ff-ff-ff-ff-ff     static
  224.0.0.22            01-00-5e-00-00-16     static
```

### Column Meanings

| Column | Description |
|--------|-------------|
| Internet Address | IPv4 address of the neighbor |
| Physical Address | MAC address (hyphen-separated) |
| Type | `dynamic` (learned via ARP) or `static` (manually added) |

## Filtering by Interface

```cmd
# Show the ARP entry for a specific remote IP

arp -a 192.168.1.100

# Show entries for a specific local interface (by its IP)
arp -a -N 192.168.1.100

# Verbose mode (includes invalid and loopback entries)
arp -a -v
```

## Using PowerShell

PowerShell provides richer ARP table access:

```powershell
# Get ARP table via NetNeighbor cmdlet
Get-NetNeighbor

# Filter by state
Get-NetNeighbor | Where-Object { $_.State -eq 'Reachable' }

# Show only specific interface
Get-NetNeighbor -InterfaceAlias 'Ethernet'

# Display IP and MAC together
Get-NetNeighbor | Select-Object IPAddress, LinkLayerAddress, State | Format-Table -AutoSize
```

Sample PowerShell output:

```text
IPAddress       LinkLayerAddress   State
---------       ----------------   -----
192.168.1.1     AA-BB-CC-DD-EE-FF  Reachable
192.168.1.20    00-11-22-33-44-55  Stale
192.168.1.255   FF-FF-FF-FF-FF-FF  Permanent
```

## ARP Entry States on Windows

| State | Meaning |
|-------|---------|
| Reachable | Recently confirmed reachable |
| Stale | Cached but not recently verified |
| Incomplete | Resolution in progress |
| Permanent | Manually configured static entry |
| Unreachable | Could not resolve |

## Exporting the ARP Table

```powershell
# Export to CSV
Get-NetNeighbor | Export-Csv -Path C:\arp_table.csv -NoTypeInformation

# Export to text file
arp -a > C:\arp_table.txt
```

## Python on Windows

```python
import subprocess

result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
lines = result.stdout.strip().split('\n')

for line in lines:
    if 'dynamic' in line or 'static' in line:
        parts = line.split()
        if len(parts) == 3:
            ip, mac, entry_type = parts
            print(f"IP: {ip:18} MAC: {mac:20} Type: {entry_type}")
```

## Key Takeaways

- `arp -a` shows the full ARP cache including dynamic and static entries.
- Use `Get-NetNeighbor` in PowerShell for filtering and scripting.
- Static entries include broadcast and multicast addresses automatically added by Windows.
- ARP entries expire based on the neighbor discovery reachable time (typically 15–45 seconds on modern Windows, per RFC 4861).

**Related Reading:**

- [How to View the ARP Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-arp-table-linux/view)
- [How to View the ARP Table on macOS](https://oneuptime.com/blog/post/2026-03-20-view-arp-table-macos/view)
- [How to Clear the ARP Cache](https://oneuptime.com/blog/post/2026-03-20-clear-arp-cache-linux/view)
