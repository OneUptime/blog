# How to Set Up Multiple Interfaces with Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, Multi-Homed, Configuration

Description: Configure multiple network interfaces with Netplan on Ubuntu, including separate management and data networks, asymmetric routing, and traffic routing per interface.

---

Servers commonly have multiple network interfaces for different purposes: a management interface for SSH and administrative access, a data interface for application traffic, and sometimes a dedicated interface for storage or backup traffic. Netplan handles multi-interface configurations well, but there are some important nuances around routing tables and default routes that catch people out.

## Identifying Available Interfaces

Start by listing all network interfaces:

```bash
# List all interfaces with their status
ip link show

# Show interfaces with MAC addresses and state
ip -br link show

# Show interfaces with IP addresses
ip -br addr show

# Get more detail on a specific interface
ethtool enp3s0    # requires ethtool package
```

Modern Ubuntu uses predictable network interface names. The naming convention helps:
- `en` prefix = ethernet
- `p3s0` = PCI slot 3, function 0
- `enp3s0` = ethernet on PCI bus 3, slot 0

## Basic Multiple Interface Configuration

Here is a straightforward two-interface setup where one gets DHCP and one gets a static IP:

```yaml
# /etc/netplan/01-multi-interface.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    # Primary interface - management network
    enp3s0:
      dhcp4: true
    # Secondary interface - internal/storage network
    enp4s0:
      dhcp4: false
      addresses:
        - 10.10.0.50/24
      # Note: no default route here - only the primary gets one
```

The key here is that only one interface should provide the default route. Adding a default gateway via both interfaces will cause routing issues.

## The Routing Problem with Multiple Interfaces

This is the most common mistake in multi-interface setups. If you have two interfaces and configure default routes on both, return traffic may exit through the wrong interface and get dropped.

Imagine:
- `enp3s0`: 192.168.1.100, gateway 192.168.1.1 (internet-facing)
- `enp4s0`: 10.10.0.50, gateway 10.10.0.1 (storage network)

If you configure default routes on both, a request coming in on `enp4s0` might get its reply sent out through `enp3s0`, which the client never expects. The solution is either to have only one default route, or to use policy-based routing with separate routing tables.

## Static Routes Instead of a Second Default Gateway

For the secondary interface, add specific routes for the networks reachable through it:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default              # this is the primary default route
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
    enp4s0:
      dhcp4: false
      addresses:
        - 10.10.0.50/24
      routes:
        # Only route traffic destined for the storage network via this interface
        - to: 10.20.0.0/24        # storage servers on another subnet
          via: 10.10.0.1
        - to: 10.30.0.0/24        # backup servers
          via: 10.10.0.1
```

## Policy-Based Routing with Multiple Tables

For situations where you truly need to handle traffic symmetrically on multiple interfaces, policy-based routing puts each interface in its own routing table:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
          table: 100            # put default route in table 100
        - to: 192.168.1.0/24
          via: 0.0.0.0          # local network route
          table: 100
      routing-policy:
        - from: 192.168.1.100   # traffic sourced from this IP uses table 100
          table: 100
    enp4s0:
      dhcp4: false
      addresses:
        - 10.10.0.50/24
      routes:
        - to: default
          via: 10.10.0.1
          table: 200            # second interface in its own table
        - to: 10.10.0.0/24
          via: 0.0.0.0
          table: 200
      routing-policy:
        - from: 10.10.0.50      # traffic from this IP uses table 200
          table: 200
```

With this setup, requests arriving on `enp4s0` (destined for `10.10.0.50`) will have their replies sent back through `enp4s0` because the routing policy matches the source address to table 200, which has `enp4s0`'s gateway as the default.

## Management Interface with DHCP, Data Interface Static

A common server pattern:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    # Management interface - gets address from DHCP
    # Used for SSH, monitoring, and admin access
    eno1:
      dhcp4: true
      dhcp4-overrides:
        route-metric: 200         # lower priority default route
        use-dns: true
    # Data interface - static address
    # Used for application traffic
    enp3s0:
      dhcp4: false
      addresses:
        - 10.0.1.50/24
      routes:
        - to: default             # primary default route, higher priority
          via: 10.0.1.1
          metric: 100
      nameservers:
        addresses:
          - 10.0.1.1
          - 8.8.8.8
```

Setting different route metrics (lower number = higher priority) tells the kernel which default route to prefer. This keeps traffic flowing through the data interface while still allowing the management interface to work if the data interface goes down.

## Applying and Verifying

```bash
# Test first
sudo netplan generate

# Apply with rollback safety
sudo netplan try

# After confirming it works, press Enter

# Verify all interfaces got addresses
ip addr show

# Check routing table
ip route show

# Check for multiple default routes (might indicate misconfiguration)
ip route show | grep default

# Test each interface's connectivity
ping -I enp3s0 -c 3 8.8.8.8
ping -I enp4s0 -c 3 10.10.0.1
```

## Handling Interface Ordering

Sometimes network interfaces are discovered in a non-deterministic order during boot, and the predictable naming does not always apply (especially in VMs or containers). To make configuration more robust:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    # Match by MAC address instead of interface name
    first-interface:
      match:
        macaddress: "aa:bb:cc:dd:ee:ff"
      set-name: eth-mgmt          # rename to a stable name
      dhcp4: true
    second-interface:
      match:
        macaddress: "aa:bb:cc:dd:ee:00"
      set-name: eth-data
      dhcp4: false
      addresses:
        - 10.10.0.50/24
```

The `match.macaddress` approach ensures the right configuration applies to the right physical interface regardless of the device name the kernel assigns.

## Monitoring Multiple Interfaces

Once you have multiple interfaces configured, verify they stay healthy:

```bash
# Check interface status
networkctl status

# View per-interface statistics
ip -s link show enp3s0

# Check for errors on interfaces
netstat -i
# or
ip -s link

# Monitor traffic per interface
iftop -i enp3s0
```

For ongoing monitoring in production, set up interface monitoring alerts so you know immediately if one of your network paths goes down. A management interface failure that goes unnoticed is a common cause of servers that are accessible on the data network but cannot be reached for administrative tasks.
