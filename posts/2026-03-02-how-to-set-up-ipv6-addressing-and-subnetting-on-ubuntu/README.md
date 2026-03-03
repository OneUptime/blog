# How to Set Up IPv6 Addressing and Subnetting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, IPv6, Netplan, Subnetting

Description: Configure IPv6 addressing and subnetting on Ubuntu using Netplan, covering static assignment, SLAAC, address types, and practical subnet planning for modern networks.

---

IPv6 adoption has accelerated significantly over the past few years, and most modern networks now run dual-stack configurations alongside IPv4. Ubuntu has supported IPv6 natively for years, and configuring it with Netplan - the default network configuration tool since Ubuntu 18.04 - is straightforward once you understand the addressing model.

## IPv6 Address Basics

IPv6 addresses are 128 bits written as 8 groups of 4 hexadecimal digits separated by colons:

```text
2001:0db8:85a3:0000:0000:8a2e:0370:7334
```

Leading zeros in each group can be omitted, and one consecutive sequence of all-zero groups can be replaced with `::`:

```text
2001:db8:85a3::8a2e:370:7334
```

Key address types:
- `::1/128` - loopback (equivalent to 127.0.0.1)
- `fe80::/10` - link-local (automatically assigned to every interface)
- `fc00::/7` - unique local (similar to RFC1918 private addresses)
- `2000::/3` - global unicast (routable on the internet)
- `ff00::/8` - multicast

## Checking Current IPv6 Status

```bash
# Check if IPv6 is enabled
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# 0 = enabled, 1 = disabled

# Show IPv6 addresses on all interfaces
ip -6 addr show

# Show IPv6 routing table
ip -6 route show

# Show link-local addresses (auto-assigned)
ip addr show | grep 'inet6.*fe80'

# Check IPv6 connectivity
ping6 ::1
ping6 ipv6.google.com
```

## Understanding IPv6 Subnetting

IPv6 subnetting differs from IPv4 in that address space is vast. Standard practice is:

- ISPs receive `/32` allocations
- Organizations receive `/48` allocations (65,536 subnets)
- Subnets are `/64` (18 quintillion addresses per subnet)

A `/64` subnet is the standard for any network segment. The first 64 bits are the network prefix, and the last 64 bits are the interface identifier.

```text
2001:db8:1234:0001::/64
|--- Network Prefix ---|--- Host Part ---|
    First 64 bits          Last 64 bits
```

## Configuring Static IPv6 with Netplan

On Ubuntu 20.04 and later, network configuration lives in `/etc/netplan/`:

```bash
# Locate your netplan configuration file
ls /etc/netplan/

# Typical filenames: 00-installer-config.yaml or 01-netcfg.yaml
```

Edit or create a netplan configuration:

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      # IPv4 configuration
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]

      # IPv6 static configuration
      addresses:
        - 192.168.1.100/24
        - 2001:db8:1234:1::10/64    # Static IPv6 address
      routes:
        - to: default
          via: 192.168.1.1
        - to: ::/0
          via: 2001:db8:1234:1::1   # IPv6 default gateway
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
          - 2001:4860:4860::8888    # Google's IPv6 DNS
          - 2001:4860:4860::8844
```

Apply the configuration:

```bash
# Validate configuration syntax
sudo netplan generate

# Apply the configuration
sudo netplan apply

# Verify the address was assigned
ip -6 addr show eth0
```

## Enabling SLAAC (Stateless Address Autoconfiguration)

SLAAC allows interfaces to configure their own IPv6 addresses based on router advertisements. This is often used when an upstream router handles address assignment.

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: yes
      dhcp6: yes          # Enable DHCPv6
      ipv6-privacy: true  # Use privacy extensions (random interface ID)
      # SLAAC is automatic when a router sends RAs
      accept-ra: true     # Accept router advertisements
```

Check if SLAAC assigned an address:

```bash
# Look for addresses with 'dynamic' or 'temporary' scope
ip -6 addr show eth0

# Check if router advertisements are being received
sudo apt install radvd-utils -y
# Or check kernel messages
dmesg | grep -i "router advertisement"
```

## Configuring Multiple IPv6 Addresses

A single interface can have multiple IPv6 addresses simultaneously:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 2001:db8:1234:1::10/64   # Primary static address
        - 2001:db8:1234:1::20/64   # Secondary static address
        - fd00:1234:5678::10/64    # Unique local address for internal services
      dhcp6: true                   # Also accept DHCP/SLAAC addresses
```

## Setting Up a /64 Subnet

For a server providing services on multiple subnets:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      # External interface - global unicast
      addresses:
        - 2001:db8:1234:1::1/64
      routes:
        - to: ::/0
          via: 2001:db8:1234:1::ffff

    eth1:
      # Internal interface - unique local
      addresses:
        - fd00:10:0:1::1/64
```

## IPv6 Privacy Extensions

Privacy extensions generate random interface identifiers that change periodically, preventing tracking based on a persistent IPv6 address:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      ipv6-privacy: true
```

Or enable via sysctl for immediate effect:

```bash
# Enable privacy extensions for all interfaces
sudo sysctl -w net.ipv6.conf.all.use_tempaddr=2
sudo sysctl -w net.ipv6.conf.default.use_tempaddr=2

# Make permanent
echo "net.ipv6.conf.all.use_tempaddr=2" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.use_tempaddr=2" | sudo tee -a /etc/sysctl.conf
```

## Disabling IPv6 on Specific Interfaces

Sometimes you need IPv6 on some interfaces but not others:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      # Dual stack
      dhcp4: true
      dhcp6: true

    eth1:
      # IPv4 only
      dhcp4: true
      link-local: []  # Disable link-local IPv6
```

Or via sysctl for a specific interface:

```bash
# Disable IPv6 on eth1 only
sudo sysctl -w net.ipv6.conf.eth1.disable_ipv6=1

# Persist the setting
echo "net.ipv6.conf.eth1.disable_ipv6=1" | sudo tee -a /etc/sysctl.conf
```

## Testing IPv6 Connectivity

```bash
# Test local loopback
ping6 ::1

# Test link-local connectivity to a neighbor
# First get the neighbor's link-local address
ip -6 neigh show

# Ping link-local (must specify interface with %)
ping6 fe80::1%eth0

# Test global connectivity
ping6 2001:4860:4860::8888  # Google DNS
ping6 ipv6.google.com

# Traceroute over IPv6
traceroute6 ipv6.google.com

# Check DNS resolution for AAAA records
dig AAAA google.com
```

## Firewall Configuration for IPv6

ip6tables or nftables handles IPv6 firewall rules. Ubuntu's ufw supports IPv6 natively:

```bash
# Verify IPv6 is enabled in UFW
grep IPV6 /etc/default/ufw
# Should show: IPV6=yes

# Allow SSH over IPv6
sudo ufw allow 22/tcp

# Allow specific IPv6 subnet
sudo ufw allow from 2001:db8:1234::/48

# Check IPv6 rules
sudo ip6tables -L -n
```

## Subnet Planning Example

For an organization with a `/48` allocation (`2001:db8:1234::/48`), you have subnets `2001:db8:1234:0000::/64` through `2001:db8:1234:ffff::/64`:

```text
Subnet allocation plan:
2001:db8:1234:0001::/64  - Management network
2001:db8:1234:0010::/64  - Production servers
2001:db8:1234:0020::/64  - Development servers
2001:db8:1234:0030::/64  - Database tier
2001:db8:1234:0100::/64  - Client network - Floor 1
2001:db8:1234:0101::/64  - Client network - Floor 2
fd00:1234:5678:0001::/64 - Internal services (ULA)
```

Document your subnet plan and keep it current. With IPv6's vast address space, there's no reason to compromise on clear, logical allocation.
