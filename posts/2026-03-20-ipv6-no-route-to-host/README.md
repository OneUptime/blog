# How to Troubleshoot IPv6 No Route to Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Troubleshooting, Routing, Network Diagnostics, Default Route, ICMPv6

Description: Diagnose and fix IPv6 'No route to host' errors by checking the routing table, default gateway, and Router Advertisement configuration.

## Introduction

"No route to host" for IPv6 means the kernel cannot find a path to the destination address in its routing table. The most common cause is a missing default route (`::/0`), which is normally provided by a Router Advertisement. Other causes include incorrect static routes, missing on-link routes, or interface configuration issues.

## Step 1: Check IPv6 Routing Table

```bash
# Show entire IPv6 routing table

ip -6 route show

# Show default route specifically
ip -6 route show default

# Show route to specific destination
ip -6 route get 2001:db8::1

# Show all routes including cached
ip -6 route show cache

# Check route table on specific interface
ip -6 route show dev eth0
```

Example healthy routing table:
```text
2001:db8:cafe::/64 dev eth0 proto kernel scope link src 2001:db8:cafe::100
fe80::/64 dev eth0 proto kernel scope link src fe80::1
default via fe80::1 dev eth0 proto ra metric 100 expires 1775sec
```

## Step 2: Identify Missing Default Route

```bash
# If this returns nothing, no default route exists
ip -6 route show default

# Check if RA was received (RA provides default route)
sudo rdisc6 eth0 2>/dev/null | grep "Router lifetime"
# Lifetime > 0 means router is valid as default gateway
# Lifetime = 0 means router explicitly says "I'm not a default gateway"

# Re-solicit Router Advertisement
sudo rdisc6 -r 3 -w 5000 eth0

# Check accept_ra setting (must be >= 1 for RAs to set default route)
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
```

## Step 3: Add Routes Manually

```bash
# Add a default route via a known router
sudo ip -6 route add default via fe80::1 dev eth0

# Add default route via global IPv6 address
sudo ip -6 route add default via 2001:db8::1

# Add route for a specific prefix
sudo ip -6 route add 2001:db8::/32 via fe80::1 dev eth0

# Add on-link route (direct, no gateway needed)
sudo ip -6 route add 2001:db8:cafe::/64 dev eth0

# Make permanent via /etc/network/interfaces or systemd-networkd
```

## Step 4: Check for Common Causes

```bash
#!/bin/bash
# diagnose-ipv6-routing.sh

echo "=== IPv6 Routing Diagnostics ==="

echo ""
echo "1. IPv6 Routing Table:"
ip -6 route show 2>/dev/null

echo ""
echo "2. Default route:"
default=$(ip -6 route show default 2>/dev/null)
if [ -n "$default" ]; then
    echo "[OK] $default"
else
    echo "[FAIL] No default IPv6 route"
fi

echo ""
echo "3. Global IPv6 address:"
global=$(ip -6 addr show scope global 2>/dev/null | grep "inet6")
if [ -n "$global" ]; then
    echo "[OK]"
    echo "$global"
else
    echo "[FAIL] No global IPv6 address"
fi

echo ""
echo "4. Ping default gateway:"
gw=$(ip -6 route show default 2>/dev/null | awk '{print $3}' | head -1)
gw_dev=$(ip -6 route show default 2>/dev/null | awk '{print $5}' | head -1)
if [ -n "$gw" ]; then
    ping -6 -c 2 -I "$gw_dev" "$gw" > /dev/null 2>&1 && \
        echo "[OK] Gateway $gw is reachable" || \
        echo "[FAIL] Cannot ping gateway $gw"
else
    echo "[SKIP] No gateway to ping"
fi

echo ""
echo "5. Ping internet IPv6:"
ping -6 -c 2 2001:4860:4860::8888 > /dev/null 2>&1 && \
    echo "[OK] Internet IPv6 reachable" || \
    echo "[FAIL] Cannot reach internet via IPv6"
```

## Step 5: Persistent Route Configuration

```bash
# systemd-networkd: /etc/systemd/network/eth0.network
cat << 'EOF' | sudo tee /etc/systemd/network/eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv6
IPv6AcceptRA=yes

[Route]
# Add static default if RA doesn't provide one
Gateway=2001:db8::1
Destination=::/0
EOF

sudo systemctl restart systemd-networkd

# Debian/Ubuntu: /etc/network/interfaces
# up ip -6 route add default via 2001:db8::1 dev eth0

# Check if ip_forwarding is causing accept_ra issues
# When forwarding=1, accept_ra must be 2 (not 1)
cat /proc/sys/net/ipv6/conf/eth0/forwarding
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=2  # if forwarding=1
```

## Conclusion

IPv6 "No route to host" is most often caused by a missing default route, which is normally installed by a Router Advertisement. Check `ip -6 route show default` first - if empty, use `rdisc6` to determine whether the router is sending RAs. If forwarding is enabled on the host (it's acting as a router), set `accept_ra=2` instead of `1`. For static configurations, add the default route with `ip -6 route add default via fe80::1 dev eth0` and persist it in your network configuration.
