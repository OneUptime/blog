# How to Configure DHCP on a Linux Network Interface Using dhclient

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, DHCP, dhclient, IPv4, Network Configuration

Description: Use dhclient to request a DHCP lease on a Linux interface, release and renew addresses, and customize DHCP client behavior through the dhclient.conf configuration file.

## Introduction

`dhclient` is the ISC DHCP client, available on most Linux distributions. It negotiates an IP address, subnet mask, default gateway, and DNS servers from a DHCP server, making it essential for dynamic network configuration.

## Basic DHCP Request

```bash
# Request a DHCP lease on eth0

sudo dhclient eth0

# Verbose mode - shows the full DHCP negotiation
sudo dhclient -v eth0
```

The `-v` output shows the Discover → Offer → Request → ACK exchange.

## Releasing a DHCP Lease

```bash
# Release the current lease on eth0
sudo dhclient -r eth0

# Verify the address is gone
ip addr show dev eth0
```

## Renewing a Lease

```bash
# Release and immediately request a new lease
sudo dhclient -r eth0 && sudo dhclient -v eth0
```

## Specifying a Lease File

```bash
# Use a specific lease file to track the lease
sudo dhclient -lf /var/lib/dhcp/dhclient.eth0.leases eth0

# View the current lease
cat /var/lib/dhcp/dhclient.eth0.leases
```

## Running dhclient in the Background

```bash
# Run as daemon - returns immediately, keeps the lease renewed
sudo dhclient -nw eth0

# Check that dhclient is running
pgrep -a dhclient
```

## Configuring dhclient.conf

Customize DHCP client behavior in `/etc/dhcp/dhclient.conf`:

```bash
sudo tee /etc/dhcp/dhclient.conf << 'EOF'
# Request specific options from the DHCP server
request subnet-mask, broadcast-address, routers, domain-name-servers;

# Prefer specific DNS servers even if DHCP provides others
supersede domain-name-servers 8.8.8.8, 8.8.4.4;

# Set a hostname to send in DHCP requests
send host-name "my-linux-host";

# Request a specific IP (hint to DHCP server, not guaranteed)
send dhcp-requested-address 192.168.1.100;
EOF
```

## Requesting IPv4 Only (Suppress IPv6)

```bash
# Request only an IPv4 address (skip DHCPv6)
sudo dhclient -4 eth0
```

## Using dhclient with Specific Scripts

dhclient runs hooks when it enters/exits bound state. Add a custom enter hook in `/etc/dhcp/dhclient-enter-hooks`:

```bash
# Create an enter hook that sets a custom hostname on each DHCP renewal
sudo tee /etc/dhcp/dhclient-enter-hooks << 'EOF'
#!/bin/sh
if [ "$reason" = "BOUND" ] || [ "$reason" = "RENEW" ]; then
    hostname my-linux-host
fi
EOF
sudo chmod +x /etc/dhcp/dhclient-enter-hooks
```

## Using systemd-networkd Instead

On modern Ubuntu/Debian with systemd-networkd:

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv4
```

```bash
sudo systemctl enable --now systemd-networkd
sudo networkctl status eth0
```

## Conclusion

`dhclient -v eth0` is the quickest way to obtain a DHCP address and see the negotiation. For production systems, use the distribution's network management tool (Netplan, NetworkManager, or systemd-networkd) to manage DHCP persistently and automatically.
