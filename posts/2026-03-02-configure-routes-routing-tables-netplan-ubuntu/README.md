# How to Configure Routes and Routing Tables with Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, Routing, Policy-Based Routing

Description: Configure static routes, custom routing tables, and policy-based routing with Netplan on Ubuntu for multi-homed servers and complex network topologies.

---

Routing configuration is where Netplan gets genuinely powerful. Beyond simple default gateways, Netplan supports static routes, multiple routing tables, and policy-based routing rules - giving you the tools to handle complex multi-homed server setups, VPN configurations, and traffic engineering.

## Static Route Basics

Every Netplan interface can have a `routes` section that adds specific routes to the main routing table:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 10.0.1.50/24
      routes:
        # Default gateway - most important route
        - to: default
          via: 10.0.1.1
        # Route to another subnet via a specific gateway
        - to: 172.16.0.0/24
          via: 10.0.1.254
        # Route to a specific host (not a subnet)
        - to: 192.168.50.5/32
          via: 10.0.1.100
```

The `to: default` syntax is the modern way to set a default gateway. The older `gateway4: 10.0.1.1` syntax still works but is deprecated.

## Route Options

Each route entry supports several options:

```yaml
routes:
  - to: 172.16.0.0/16
    via: 10.0.1.254
    metric: 200           # route priority (lower = preferred)
    on-link: true         # don't check if gateway is directly reachable
    type: unicast         # route type (unicast, blackhole, unreachable, prohibit)
    scope: global         # route scope
    table: 100            # put this route in a specific routing table
    mtu: 1400             # override MTU for this specific route
```

## Route Metrics

When multiple routes can reach the same destination, the kernel uses the metric to decide which to use:

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
          metric: 100        # primary gateway, preferred
    enp4s0:
      dhcp4: false
      addresses:
        - 192.168.2.100/24
      routes:
        - to: default
          via: 192.168.2.1
          metric: 200        # backup gateway, used only if primary fails
```

Lower metric wins. This creates a primary/backup gateway setup.

## Blackhole and Unreachable Routes

Netplan supports special route types for traffic engineering:

```yaml
routes:
  # Blackhole: silently drop traffic to this prefix
  - to: 10.99.0.0/16
    via: 0.0.0.0
    type: blackhole

  # Unreachable: drop traffic and send ICMP unreachable
  - to: 10.88.0.0/16
    via: 0.0.0.0
    type: unreachable

  # Prohibit: drop traffic and send ICMP prohibited
  - to: 10.77.0.0/16
    via: 0.0.0.0
    type: prohibit
```

Blackhole routes are useful for preventing traffic from leaking to the default gateway when a more specific route is temporarily unavailable.

## Custom Routing Tables

Linux supports up to 255 named routing tables. Additional tables are used with policy-based routing (PBR) to direct different traffic through different paths.

Route tables are defined by number (1-255) or by name in `/etc/iproute2/rt_tables`:

```bash
# View existing named tables
cat /etc/iproute2/rt_tables

# Default entries:
# 255  local
# 254  main
# 253  default
# 0    unspec

# Add custom table names (optional - you can use numbers directly)
echo "100 mgmt" | sudo tee -a /etc/iproute2/rt_tables
echo "200 data" | sudo tee -a /etc/iproute2/rt_tables
```

## Policy-Based Routing (Multi-Homed Server)

The key problem with multi-homed servers: if traffic arrives on interface A, the reply might go out interface B (the one with the default route), and the remote host drops it because the source IP doesn't match the interface it's expecting.

The fix is policy-based routing: match traffic based on source IP and route it through the interface that owns that IP.

```yaml
# /etc/netplan/01-pbr.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        # Routes in the main table (for outbound traffic from this host)
        - to: default
          via: 192.168.1.1
          metric: 100
        # Routes in table 100 (for policy-routed traffic)
        - to: default
          via: 192.168.1.1
          table: 100
        - to: 192.168.1.0/24
          via: 0.0.0.0
          scope: link
          table: 100
      routing-policy:
        # Any traffic sourced from 192.168.1.100 uses table 100
        - from: 192.168.1.100
          table: 100
          priority: 100
    enp4s0:
      dhcp4: false
      addresses:
        - 10.10.0.50/24
      routes:
        # Routes in table 200 for the second interface
        - to: default
          via: 10.10.0.1
          table: 200
        - to: 10.10.0.0/24
          via: 0.0.0.0
          scope: link
          table: 200
      routing-policy:
        # Traffic sourced from 10.10.0.50 uses table 200
        - from: 10.10.0.50
          table: 200
          priority: 200
```

After applying this configuration, test it:

```bash
# Verify routing tables
ip route show table 100
ip route show table 200

# Test which route traffic takes for each source IP
ip route get 8.8.8.8 from 192.168.1.100
ip route get 8.8.8.8 from 10.10.0.50

# Check routing policy rules
ip rule show
```

## Routing Policy with Mark-Based Routing

For more advanced scenarios, you can route traffic based on packet marks (set by iptables or nftables):

```yaml
routing-policy:
  - from: all
    fwmark: 1234       # only packets with this fwmark
    table: 100
    priority: 50
```

Then set the mark with iptables:

```bash
# Mark outbound traffic from a specific process or port
sudo iptables -t mangle -A OUTPUT -p tcp --dport 8080 -j MARK --set-mark 1234
```

## VPN Routing with Netplan

For VPN setups where you want specific traffic to go through a VPN tunnel while other traffic uses the normal internet connection (split tunneling):

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
        # Route VPN-specific subnets through the VPN gateway
        - to: 10.8.0.0/24
          via: 10.8.0.1      # VPN gateway (after tunnel is up)
        # Internal corporate networks via VPN
        - to: 172.16.0.0/12
          via: 10.8.0.1
```

Note that VPN routes are typically added by the VPN client (OpenVPN, WireGuard) dynamically, not through Netplan. Netplan is for persistent routes that survive reboots regardless of VPN state.

## Verifying Routes

```bash
# Show main routing table
ip route show

# Show all routes including kernel-generated link routes
ip route show table all

# Show a specific routing table
ip route show table 100

# Find which route would be used for a destination
ip route get 8.8.8.8

# With source IP specified (for PBR testing)
ip route get 8.8.8.8 from 10.10.0.50

# Show routing policy rules
ip rule show

# Monitor routing table changes in real time
ip monitor route
```

## Troubleshooting Route Issues

**Route not appearing after netplan apply:**

```bash
# Check netplan generate for errors
sudo netplan generate

# Check networkd logs
sudo journalctl -u systemd-networkd | grep -i route

# Manually add the route to test before committing to Netplan
sudo ip route add 172.16.0.0/24 via 10.0.1.254 dev enp3s0

# If the manual route works, the Netplan YAML syntax may be wrong
```

**Traffic going out wrong interface:**

```bash
# Check routing policy rules are created
ip rule show

# Test source-based routing
ip route get 8.8.8.8 from 192.168.1.100
ip route get 8.8.8.8 from 10.10.0.50

# Capture traffic to see which interface it uses
sudo tcpdump -i enp3s0 host 8.8.8.8 &
sudo tcpdump -i enp4s0 host 8.8.8.8 &
curl -s --interface 10.10.0.50 http://ifconfig.me
```

**Routes lost after reboot:**

```bash
# Verify cloud-init isn't overwriting network config
cat /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg

# Check Netplan file permissions
ls -la /etc/netplan/

# Verify systemd-networkd is enabled and starts at boot
sudo systemctl is-enabled systemd-networkd
```

Routing configuration in Netplan covers everything from simple gateway settings to complex policy-based routing. The YAML format makes it easy to review and version-control routing configurations alongside the rest of your infrastructure code.
