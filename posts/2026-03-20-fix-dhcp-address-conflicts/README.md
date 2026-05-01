# How to Fix DHCP Address Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Networking, Address Conflicts, Troubleshooting, Sysadmin

Description: DHCP address conflicts occur when two devices use the same IP simultaneously, causing network failures that can be resolved by identifying the conflicting hosts, using DHCP conflict detection, and...

## What Causes DHCP Address Conflicts

1. A static IP was assigned to a host that overlaps with the DHCP pool.
2. DHCP server leased an IP that another device already had configured statically.
3. A stale lease was assigned to a new device and the original device later came back online.
4. Multiple DHCP servers handed out the same address.

## ISC dhcpd: Built-in Conflict Detection

dhcpd can ping an address before offering it:

```text
# /etc/dhcp/dhcpd.conf

# Ping an address before offering it to detect conflicts
ping-check true;
ping-timeout 1;
```

## Detecting Active Conflicts

```bash
# Probe the conflicted IP directly and note which MAC address replies
sudo arping -I eth0 192.168.1.50

# Scan the local subnet and map IPs to MAC addresses
sudo arp-scan --interface=eth0 192.168.1.0/24

# Optional: list live hosts on the subnet for cross-checking
nmap -sn 192.168.1.0/24
```

## Finding Conflicted Leases

```bash
# ISC dhcpd: look for abandoned leases in the lease file
grep -B1 -A6 "binding state abandoned;" /var/lib/dhcp/dhcpd.leases

# Also check DHCP server logs
journalctl -u isc-dhcp-server | grep -i "DHCPDECLINE\|abandon"
```

## Resolving Conflicts

### Step 1: Identify Both Devices

```bash
# arping shows which MAC address replies for the conflicted IP
sudo arping -I eth0 192.168.1.50

# Scan the subnet and filter for the conflicted IP
sudo arp-scan --interface=eth0 192.168.1.0/24 | grep -F "192.168.1.50"
```

### Step 2: Remove Stale Leases

```bash
# Edit dhcpd.leases to remove the conflicted lease
sudo systemctl stop isc-dhcp-server
sudo vi /var/lib/dhcp/dhcpd.leases
# Remove the current lease declaration for the conflicted IP
sudo systemctl start isc-dhcp-server
```

### Step 3: Exclude the Static IP from the DHCP Pool

```text
# Add to /etc/dhcp/dhcpd.conf
# Exclude addresses used by static devices from the dynamic range
subnet 192.168.1.0 netmask 255.255.255.0 {
    # Dynamic pool starts AFTER static device range
    range 192.168.1.50 192.168.1.200;
    # OR convert the static device to a reservation
}
```

## Windows Server: View and Resolve Conflicts

```powershell
# View declined (bad) leases
Get-DhcpServerv4Lease -ScopeId 192.168.1.0 -BadLeases

# Remove declined (bad) leases in the scope
Remove-DhcpServerv4Lease -ScopeId 192.168.1.0 -BadLeases

# Enable conflict detection (number of pings before offering)
Set-DhcpServerSetting -ConflictDetectionAttempts 1
```

## Key Takeaways

- Conflicts most commonly occur when static IPs overlap with the DHCP pool.
- Enable conflict detection (`ping-check true` in dhcpd) to reduce the chance of re-offering in-use addresses.
- Use `arping` and `arp-scan` to identify which MAC address is answering for the conflicted IP.
- Best practice: keep statically assigned addresses completely separate from the DHCP pool.
