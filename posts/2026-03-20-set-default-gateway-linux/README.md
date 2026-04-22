# How to Set a Default Gateway on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Default Gateway, Routing, iproute2, Networking, Network Configuration

Description: Set the default gateway on Linux using ip route to define where traffic for unknown destinations is forwarded, enabling internet access from the host.

## Introduction

The default gateway is the router that a host sends traffic to when no specific route matches the destination. Without a default gateway, a host is typically limited to directly connected networks and any explicitly configured routes. Setting the correct default gateway is essential for internet connectivity.

## Set the Default Gateway

```bash
# Add a default gateway

# For IPv4, 'default' is equivalent to 0.0.0.0/0
ip route add default via 192.168.1.1

# Or be explicit
ip route add 0.0.0.0/0 via 192.168.1.1

# With specific interface
ip route add default via 192.168.1.1 dev eth0
```

## View the Current Default Gateway

```bash
# Show all routes (the default route normally appears as 'default')
ip route show

# Show only the default route
ip route show default

# Output:
# default via 192.168.1.1 dev eth0 proto static
```

## Replace the Default Gateway

```bash
# Remove the old default route first
ip route del default

# Add the new one
ip route add default via 192.168.1.254

# Or use replace (atomic operation)
ip route replace default via 192.168.1.254
```

## Set Default Gateway via DHCP

If using DHCP, the gateway can be provided automatically by the DHCP server. Manually trigger DHCP:

```bash
dhclient eth0    # Requests a DHCP lease including gateway information
```

## Persistent Default Gateway

### Netplan (Ubuntu)

```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
```

### nmcli (RHEL)

```bash
nmcli connection modify "<connection-name>" ipv4.gateway "192.168.1.1"
nmcli connection up "<connection-name>"
```

### systemd-networkd

```ini
[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
```

### /etc/network/interfaces (Debian)

```bash
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
```

## Verify Default Gateway

```bash
# Check routing
ip route show default

# Test connectivity to the gateway
ping -c 3 192.168.1.1

# Test internet access through the gateway
ping -c 3 8.8.8.8
```

## Conclusion

The default gateway is set with `ip route add default via <gateway-ip>`. It defines where traffic goes when no specific route matches - typically the router's LAN IP. For production servers, always configure the gateway in your distribution's network manager (Netplan, nmcli, systemd-networkd) for persistence. Use `ip route show default` to verify the current gateway.
