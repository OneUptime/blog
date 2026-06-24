# How to Configure DHCP Reservations for Static Assignments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Networking, Reservation, Static IP, Sysadmin, MAC Address

Description: DHCP reservations (also called static DHCP or DHCP binding) assign a specific IP address to a device based on its MAC address, combining the convenience of DHCP with the predictability of a static IP.

## What Is a DHCP Reservation?

A reservation tells the DHCP server: "Whenever you see this MAC address, give it this IP." The client still uses DHCP and, on initial address acquisition, follows the usual DISCOVER/OFFER/REQUEST/ACK flow.

## ISC dhcpd (Legacy): Adding Reservations

ISC DHCP is end-of-life upstream, but the syntax below is still used in existing deployments.

```nginx
# /etc/dhcp/dhcpd.conf

subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
}

# Reservation for web server

host webserver {
    hardware ethernet AA:BB:CC:DD:EE:01;
    fixed-address 192.168.1.10;
    option host-name "webserver";
}

# Reservation for network printer
host printer-office {
    hardware ethernet AA:BB:CC:DD:EE:02;
    fixed-address 192.168.1.15;
}

# Reservation with custom options
host voip-phone-1 {
    hardware ethernet AA:BB:CC:DD:EE:03;
    fixed-address 192.168.1.20;
    option tftp-server-name "192.168.1.5";
    filename "SEPdefault.cnf";
}
```

Apply on Debian/Ubuntu:
```bash
sudo systemctl restart isc-dhcp-server
```

## dnsmasq: Adding Reservations

```text
# /etc/dnsmasq.conf

# Format: dhcp-host=MAC,IP[,hostname[,lease-time]]
dhcp-host=AA:BB:CC:DD:EE:01,192.168.1.10,webserver,infinite
dhcp-host=AA:BB:CC:DD:EE:02,192.168.1.15,printer
dhcp-host=AA:BB:CC:DD:EE:03,192.168.1.20,voip-phone-1

# Deny unknown hosts (whitelist mode)
# dhcp-ignore=tag:!known
```

## Windows Server PowerShell

```powershell
# Add a DHCP reservation
Add-DhcpServerv4Reservation `
    -ScopeId 192.168.1.0 `
    -IPAddress 192.168.1.10 `
    -ClientId "AA-BB-CC-DD-EE-01" `
    -Description "Web Server" `
    -Name "webserver"

# List all reservations in a scope
Get-DhcpServerv4Reservation -ScopeId 192.168.1.0

# Remove a reservation
Remove-DhcpServerv4Reservation -ScopeId 192.168.1.0 -IPAddress 192.168.1.10
```

## Finding a Device's MAC Address

```bash
# Linux: view MAC for eth0
ip link show eth0 | grep ether

# macOS
ifconfig en0 | grep ether

# Windows
ipconfig /all | findstr "Physical"

# Linux/macOS: from ARP table (if device is on same subnet)
arp -a | grep 192.168.1.50
```

## Best Practices

- Keep reservation addresses in the correct subnet or scope for your DHCP server.
- If you manually assign static IPs outside DHCP, exclude those addresses from the DHCP pool.
- Some admins use a dedicated portion of the subnet for reservations, but whether it sits inside or outside the dynamic pool depends on the DHCP server.
- Document MAC-to-IP mappings in your IPAM tool.

## Key Takeaways

- Reservations commonly use MAC address matching to assign the same IP to a device.
- The reserved IP must be valid for the subnet or scope; whether it should also sit outside the dynamic pool depends on the DHCP server.
- ISC dhcpd uses `host` blocks; dnsmasq uses `dhcp-host` lines; Windows Server uses `Add-DhcpServerv4Reservation`.
- Reservations can be preferable to purely static IPs because the DHCP server still distributes gateway, DNS, and other options centrally.
