# How to Fix Duplicate IPv4 Address Detection Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Duplicate IP, ARP, DHCP, Window, Troubleshooting

Description: Learn how to detect and resolve duplicate IPv4 address errors where Windows disables the adapter after detecting another device using the same IP address.

## What Is Duplicate Address Detection?

When a device gets an IP address (via DHCP or static config), it performs ARP probing to check if that IP is already in use. If Windows detects a conflict during that check, it:
1. May log Event ID 4199 in the System event log
2. Marks the duplicate IPv4 address as unusable until the conflict is cleared

## Step 1: Confirm Duplicate Address Detection

```powershell
# Windows Event Viewer - check for Event ID 4199
eventvwr.msc
# Navigate: Windows Logs → System
# Filter: Source = "Tcpip" or Event ID = 4199

# PowerShell check
Get-WinEvent -FilterHashtable @{ LogName='System'; ProviderName='Tcpip'; Id=4199 } -MaxEvents 20 |
    Format-List TimeCreated, Id, ProviderName, Message

# Check whether Windows marked any IPv4 address as Duplicate
Get-NetIPAddress -AddressFamily IPv4 |
    Format-Table InterfaceAlias, IPAddress, AddressState

# Check current IPv4 status
ipconfig /all
# A DHCP client that declined an offered address may show no leased IPv4 address
# An address in AddressState Duplicate will not be used by Windows
```

## Step 2: Identify Both Conflicting Devices

```bash
# From another host on the same LAN, probe the conflicted IP

# Use arping (Linux)
sudo arping -c 5 -I eth0 192.168.1.50

# If two MACs reply, you have a conflict:
# ARPING 192.168.1.50 from 192.168.1.100 eth0
# Unicast reply from 192.168.1.50 [AA:BB:CC:DD:EE:11] 1.234ms  <- Device 1
# Unicast reply from 192.168.1.50 [11:22:33:44:55:66] 1.890ms  <- Device 2 (CONFLICT)

# If you only see one MAC, investigate switch/router ARP probing features
# as a possible false positive during Windows duplicate address detection

# Look up MAC vendor to identify device type
# AA:BB:CC = OUI prefix → check at https://macvendors.com
```

```cmd
REM Windows - check which MAC is currently cached for the conflicted IP
arp -a | findstr "192.168.1.50"

REM Scan the subnet to help identify the device behind that MAC
nmap -sn 192.168.1.0/24
```

## Step 3: Release the Conflicting IP

```cmd
REM On a DHCP-enabled Windows device showing the error:
REM Release the current lease
ipconfig /release

REM Wait a few seconds
ping 127.0.0.1 -n 5 > nul

REM Renew to get a new, non-conflicting IPv4 lease
ipconfig /renew
ipconfig /all

REM If the adapter uses a static IPv4 address, change that static address instead
```

## Step 4: Fix the Root Cause

**If one device has a static IP in the DHCP range:**

```bash
# In ISC DHCP for IPv4, do not overlap fixed addresses with dynamic ranges.
# /etc/dhcp/dhcpd.conf
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
}

# Option A: Move the statically configured device outside the dynamic pool
# Configure the static device to use 192.168.1.50 (outside the range)

# Option B: If the device should use DHCP, reserve an address outside the range
host conflict_device {
    hardware ethernet AA:BB:CC:DD:EE:11;
    fixed-address 192.168.1.50;
}

# Restart DHCP server
sudo systemctl restart isc-dhcp-server
```

**If a switch or router is probing addresses during Windows DAD:**

```powershell
# Fix the network device by disabling or delaying its ARP probing during Windows DAD.
# Temporary Windows-side workaround only for well-managed networks:
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv4 -DadTransmits 0
```

## Step 5: Verify DHCP Conflict Detection

```bash
# ISC DHCP already pings candidate IPv4 leases before assigning them.
# Set it explicitly if you want the behavior documented in config.
# /etc/dhcp/dhcpd.conf
ping-check true;
ping-timeout 2;

# DHCPD will ping the IP before assigning it
# If a device responds, that IP is skipped
```

## Step 6: Monitor for Future Conflicts

```bash
# Prepare arpwatch's database
sudo mkdir -p /usr/local/arpwatch
sudo touch /usr/local/arpwatch/arp.dat
```

```bash
# Start continuous ARP monitoring on the LAN interface
sudo arpwatch -D /usr/local/arpwatch -f arp.dat -i eth0
```

## Conclusion

Duplicate address detection activity is confirmed via Windows event logs and IPv4 address state. A real IPv4 conflict is confirmed when `arping` shows two MACs for one IP. Fix DHCP clients with `ipconfig /release` and `ipconfig /renew`, move fixed IPv4 assignments outside the ISC DHCP dynamic pool, and if Event ID 4199 is a false positive, stop switch/router ARP probing during Windows DAD. Leave ISC DHCP `ping-check` enabled for dynamic leases, and use `arpwatch` to monitor future MAC/IP changes.
