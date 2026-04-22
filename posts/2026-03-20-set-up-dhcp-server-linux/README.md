# How to Set Up a DHCP Server on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Linux, Networking, Server Configuration, IP Addressing, Sysadmin

Description: Setting up a DHCP server on Linux using ISC dhcpd or dnsmasq enables automatic IP address assignment to clients on your network, configured through subnet declarations and option statements.

## Option 1: ISC DHCP Server (dhcpd)

ISC DHCP is no longer maintained upstream, but some Linux distributions still package it. For new deployments, consider Kea or another maintained DHCP server.

### Installation

```bash
# Debian/Ubuntu

sudo apt install isc-dhcp-server

# RHEL/CentOS
sudo yum install dhcp-server
```

### Configuration: /etc/dhcp/dhcpd.conf

```nginx
# Global options
option domain-name "example.com";
option domain-name-servers 8.8.8.8, 1.1.1.1;
default-lease-time 86400;     # 24 hours
max-lease-time 604800;        # 7 days

# Subnet declaration
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;   # Dynamic pool
    option routers 192.168.1.1;
    option subnet-mask 255.255.255.0;
    option broadcast-address 192.168.1.255;
}

# Static reservation for a specific MAC
host webserver {
    hardware ethernet aa:bb:cc:dd:ee:ff;
    fixed-address 192.168.1.50;
}
```

### Specify the Interface

```bash
# Debian/Ubuntu: edit /etc/default/isc-dhcp-server
# Replace eth0 with the interface connected to the client subnet
sudo sed -i 's/^INTERFACESv4=.*/INTERFACESv4="eth0"/' /etc/default/isc-dhcp-server

# RHEL/CentOS: dhcpd listens on interfaces that match subnet declarations.
# To restrict it further, append interface names to the dhcpd.service ExecStart.
```

### Start and Enable

```bash
# Debian/Ubuntu
sudo systemctl enable --now isc-dhcp-server
sudo systemctl status isc-dhcp-server

# RHEL/CentOS
sudo systemctl enable --now dhcpd
sudo systemctl status dhcpd

# Check for config errors
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf
```

## Option 2: dnsmasq (Lightweight)

```bash
sudo apt install dnsmasq
```

Edit `/etc/dnsmasq.conf`:

```text
interface=eth0
dhcp-range=192.168.1.100,192.168.1.200,24h
dhcp-option=option:router,192.168.1.1
dhcp-option=option:dns-server,8.8.8.8,1.1.1.1
dhcp-option=option:netmask,255.255.255.0

# Static lease
dhcp-host=aa:bb:cc:dd:ee:ff,192.168.1.50,webserver
```

```bash
sudo systemctl enable --now dnsmasq
```

## Viewing Active Leases

```bash
# ISC dhcpd lease database (Debian/Ubuntu)
cat /var/lib/dhcp/dhcpd.leases

# ISC dhcpd lease database (RHEL/CentOS)
cat /var/lib/dhcpd/dhcpd.leases

# dnsmasq lease file
cat /var/lib/misc/dnsmasq.leases
```

## Verifying from a Client

```bash
# Request a new DHCP lease on a client
sudo dhclient -v eth0

# Or with NetworkManager
nmcli connection up your-connection-name
```

## Key Takeaways

- ISC dhcpd is full-featured but no longer maintained upstream; dnsmasq is lighter and combines DNS+DHCP.
- Configure the address range, default gateway/router, DNS servers, and subnet mask at minimum.
- Test the config syntax with `dhcpd -t` before restarting the service.
- Use MAC-based reservations (`host` blocks in dhcpd, `dhcp-host` in dnsmasq) for servers and printers.
