# How to Configure Static IPv6 with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netplan, IPv6, Ubuntu, Static IP, Linux

Description: Configure static IPv6 addresses on Ubuntu and Debian systems using Netplan YAML configuration with proper gateway and DNS settings.

## What is Netplan?

Netplan is a YAML-based network configuration tool used in Ubuntu 17.10+ as the default configuration layer. It generates configurations for networkd or NetworkManager backends.

## Step 1: Identify Your Interface

```bash
# List network interfaces

ip link show

# Or check Netplan files
ls /etc/netplan/
```

## Step 2: Configure Static IPv6

Create or edit the Netplan configuration file:

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  renderer: networkd  # or: networkmanager

  ethernets:
    eth0:
      # Combined IPv4 and IPv6 static configuration
      # Using YAML list - multiple addresses are supported
      addresses:
        - 192.168.1.100/24        # IPv4
        - 2001:db8::100/64        # IPv6 global unicast
        - fe80::1/64              # Optional: custom link-local

      # IPv4 gateway
      routes:
        - to: default
          via: 192.168.1.1
          metric: 100

        # IPv6 default route
        - to: "::/0"
          via: "2001:db8::1"
          metric: 100

      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
          - 2001:4860:4860::8888  # IPv6 DNS
          - 2001:4860:4860::8844  # IPv6 DNS secondary
        search:
          - example.com
```

## Step 3: Apply the Configuration

```bash
# Test the configuration (dry run)
sudo netplan try

# Apply the configuration
sudo netplan apply

# Verify IPv6 is configured
ip -6 addr show eth0
ip -6 route show
```

## Step 4: Verify Static IPv6

```bash
# Check IPv6 address is assigned
ip -6 addr show dev eth0
# Expected: inet6 2001:db8::100/64 scope global

# Verify default IPv6 route
ip -6 route show default
# Expected: default via 2001:db8::1 dev eth0 proto static

# Test connectivity
ping6 -c 4 2001:4860:4860::8888
ping6 -c 4 google.com

# Check DNS resolves AAAA
dig AAAA google.com +short
```

## Multiple IPv6 Addresses

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
        - 2001:db8:1::100/64     # Primary IPv6
        - 2001:db8:1::200/64     # Secondary IPv6
        - 2001:db8:2::100/64     # From a different prefix
      routes:
        - to: "::/0"
          via: "2001:db8:1::1"
```

## Server-Side Configuration Example

```yaml
# /etc/netplan/50-cloud-init.yaml
# Typical cloud server configuration

network:
  version: 2
  ethernets:
    ens3:
      dhcp4: false
      dhcp6: false
      addresses:
        - 203.0.113.10/24
        - 2001:db8:abcd::10/64
      routes:
        - to: 0.0.0.0/0
          via: 203.0.113.1
        - to: "::/0"
          via: "2001:db8:abcd::1"
      nameservers:
        addresses:
          - 8.8.8.8
          - 2001:4860:4860::8888
```

## Monitoring with OneUptime

After configuring static IPv6 with Netplan, use [OneUptime](https://oneuptime.com) to monitor your server's IPv6 address reachability. Create ICMP monitors for your IPv6 address to detect when the static configuration is lost after reboots or network restarts.

## Conclusion

Configuring static IPv6 with Netplan is straightforward - add the IPv6 address to the `addresses` list and add a default IPv6 route to the `routes` section. Always include IPv6 DNS servers and test with `ping6` and `dig AAAA` after applying the configuration.
