# How to Fix Network Unreachable Route Errors on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Routing, Troubleshooting, Ip route, Network Unreachable

Description: Learn how to diagnose and fix 'Network is unreachable' errors on Linux by examining the routing table, adding missing routes, and correcting gateway misconfigurations.

---

"Network is unreachable" is one of the most common Linux networking errors. It usually means the kernel has no usable route to the destination - there is no entry in the routing table that matches the target IP, and no default gateway to fall back on. This guide shows how to find and fix the root cause.

---

## Understanding the Error

```bash
ping 8.8.8.8
# connect: Network is unreachable

# This usually means: no usable route exists in the routing table for 8.8.8.8

# Either the default route is missing, or no matching route exists
```

---

## Step 1: Check the Routing Table

```bash
# View the current routing table
ip route show

# Example output with MISSING default route:
# 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100

# No "default via X.X.X.X" entry = off-subnet traffic without a more specific route fails
```

---

## Step 2: Add a Default Route

```bash
# Add a default route via the gateway
sudo ip route add default via 192.168.1.1

# Specify the interface if ambiguous
sudo ip route add default via 192.168.1.1 dev eth0

# Verify
ip route show
# default via 192.168.1.1 dev eth0
```

---

## Step 3: Add a Specific Route

For "Network unreachable" to a specific subnet:

```bash
# Add a route to a specific network
sudo ip route add 10.0.0.0/8 via 192.168.1.254

# Add a host route
sudo ip route add 10.0.5.10/32 via 192.168.1.254

# Verify the route is working
ip route get 10.0.5.10
# 10.0.5.10 via 192.168.1.254 dev eth0
```

---

## Step 4: Make Routes Permanent

### systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8

[Route]
Destination=10.0.0.0/8
Gateway=192.168.1.254
```

```bash
sudo systemctl restart systemd-networkd
```

### NetworkManager

```bash
# Add default gateway
nmcli connection modify "Wired connection 1" \
    ipv4.gateway "192.168.1.1"

# Add static route
nmcli connection modify "Wired connection 1" \
    +ipv4.routes "10.0.0.0/8 192.168.1.254"

nmcli connection up "Wired connection 1"
```

### /etc/network/interfaces (Debian/Ubuntu)

```bash
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    up ip route add 10.0.0.0/8 via 192.168.1.254
```

### Legacy /etc/sysconfig/network-scripts/ (RHEL/CentOS 7 and similar)

```bash
# /etc/sysconfig/network-scripts/ifcfg-eth0
GATEWAY=192.168.1.1

# /etc/sysconfig/network-scripts/route-eth0
10.0.0.0/8 via 192.168.1.254
```

---

## Common Scenarios and Fixes

### Scenario 1: Missing Default Route After Reboot

```bash
# Symptom: Works until reboot, fails after
ip route show | grep default
# (empty - default route not persisted)

# Fix: Add to network config file (see above)
# Verify persistence by rebooting and checking again
```

### Scenario 2: Wrong Interface for Default Route

```bash
# Symptom: Multiple interfaces, traffic going to wrong one
ip route show
# default via 10.0.0.1 dev eth1  ← wrong interface

# Fix: Delete wrong route, add correct one
sudo ip route del default via 10.0.0.1 dev eth1
sudo ip route add default via 192.168.1.1 dev eth0
```

### Scenario 3: VPN Kills Default Route

```bash
# Symptom: All connectivity lost when VPN connects
ip route show
# default via 10.8.0.1 dev tun0  ← VPN has replaced default route

# Fix: Restore the original default route and add only the VPN subnet you need
sudo ip route replace default via 192.168.1.1 dev eth0
sudo ip route add 10.20.0.0/16 via 10.8.0.1 dev tun0
```

### Scenario 4: Route Missing After Docker/KVM Install

```bash
# Docker or KVM may add/modify routes
# Check for conflicting routes
ip route show table all | grep "unreachable\|prohibit\|blackhole"

# Remove conflicting routes
sudo ip route del blackhole 10.0.0.0/8
```

---

## Diagnosing with ip route get

```bash
# Check what route would be used for a specific destination
ip route get 8.8.8.8
# 8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.100

# If unreachable:
ip route get 10.5.0.1
# RTNETLINK answers: Network is unreachable
```

---

## Best Practices

1. **Always persist routes** - temporary `ip route add` commands are lost on reboot
2. **Use `ip route get X.X.X.X`** to verify routing before testing with ping
3. **Check `ip route show table all`** for routes in non-default tables
4. **Do not rely on `ip route show cache`** - Linux removed the IPv4 routing cache in kernel 3.6, so use `ip route get` to inspect the route the kernel would choose
5. **Monitor routing changes** with `ip monitor route` during live troubleshooting

---

## Conclusion

"Network is unreachable" usually means the kernel does not have a usable route for the destination. Use `ip route show` to identify what's absent, `ip route add` to fix it temporarily, and then persist the route in your network configuration for stability across reboots.

---

*Monitor your server connectivity and detect routing failures with [OneUptime](https://oneuptime.com).*
