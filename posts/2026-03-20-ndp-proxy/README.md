# How to Configure NDP Proxy for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NDP, Proxy, Linux, Networking, Routing

Description: Configure NDP Proxy on Linux to enable IPv6 neighbor discovery across routed segments and support proxy NDP for delegated prefixes.

## What is NDP Proxy?

NDP Proxy allows a router to answer Neighbor Solicitation messages on behalf of hosts on a different interface. This is analogous to ARP Proxy in IPv4.

Use cases:
- ISP delegating a /48 to a customer while router has a /64 on the upstream link
- Enabling SLAAC on subnets bridged behind a NAT64 translator
- Mobile broadband where the device bridges a /128 prefix

## Enabling NDP Proxy on Linux

```bash
# Enable NDP proxy on the interface facing upstream

sysctl -w net.ipv6.conf.eth0.proxy_ndp=1

# Persist
echo "net.ipv6.conf.eth0.proxy_ndp = 1" >> /etc/sysctl.d/99-ndp-proxy.conf
sysctl -p /etc/sysctl.d/99-ndp-proxy.conf

# Add a proxy NDP entry for a specific address
# (proxy NS/NA for 2001:db8::100 on eth0)
ip -6 neigh add proxy 2001:db8::100 dev eth0

# List proxy entries
ip -6 neigh show proxy

# Remove a proxy entry
ip -6 neigh del proxy 2001:db8::100 dev eth0
```

## NDP Proxy for Delegated Prefix

ISP gives a /48 prefix. The router has one address on the WAN side but needs to proxy NDP for all hosts using the /48:

```bash
#!/bin/bash
# ndp-proxy-setup.sh - Proxy NDP for delegated /64

WAN_IFACE="eth0"
LAN_IFACE="eth1"
LAN_PREFIX="2001:db8:1::/64"

# Enable proxy_ndp on WAN interface
sysctl -w net.ipv6.conf.${WAN_IFACE}.proxy_ndp=1

# For each host in the LAN, add a proxy entry on WAN
# In practice, use ndppd (daemon) for automatic proxy

# Add specific addresses
for ADDR in "2001:db8:1::10" "2001:db8:1::11" "2001:db8:1::12"; do
    ip -6 neigh add proxy ${ADDR} dev ${WAN_IFACE}
    echo "Proxy NDP for ${ADDR} on ${WAN_IFACE}"
done
```

## ndppd - Automatic NDP Proxy Daemon

`ndppd` automates proxy NDP by watching for NS messages and proxying for matching prefixes:

```bash
# Install ndppd
apt-get install -y ndppd

# /etc/ndppd.conf
cat > /etc/ndppd.conf << 'EOF'
proxy eth0 {
    autowire yes
    rule 2001:db8:1::/64 {
        iface eth1
    }
}
EOF

# Start ndppd
systemctl enable ndppd
systemctl start ndppd

# Verify
systemctl status ndppd
journalctl -u ndppd -f
```

## NDP Proxy with VXLAN Overlay

In overlay networks, NDP proxy reduces broadcast NDP traffic:

```bash
# Configure bridge (neigh_suppress is a per-port flag, set on the slave below)
ip link add br100 type bridge
ip link set br100 up

# Attach a VXLAN port and enable neigh_suppress on it
ip link add vxlan100 type vxlan id 100 dstport 4789 local 192.0.2.1
ip link set vxlan100 master br100
ip link set vxlan100 up
bridge link set dev vxlan100 neigh_suppress on

# Add static NDP entries to suppress NS flooding
ip -6 neigh add 2001:db8:100::10 \
    lladdr 52:54:00:11:22:33 \
    dev br100 \
    nud permanent

# Verify neighbor suppression is active (-d shows per-port flags)
bridge -d link show | grep neigh_suppress
```

## NDP Proxy for Mobile Networks

```bash
#!/bin/bash
# Mobile broadband NDP proxy
# Interface ppp0 gets a /128; proxy NDP for LAN hosts

MOBILE_IFACE="ppp0"
LAN_IFACE="eth0"
MOBILE_ADDR=$(ip -6 addr show dev ${MOBILE_IFACE} scope global | \
    grep inet6 | awk '{print $2}' | cut -d/ -f1)

echo "Mobile IPv6: ${MOBILE_ADDR}"

# Enable proxy
sysctl -w net.ipv6.conf.${MOBILE_IFACE}.proxy_ndp=1

# Add routing and proxy for LAN prefix
# (Router has 2001:db8:1::/64 on LAN with 2001:db8:1::1)
ip -6 route add 2001:db8:1::/64 dev ${LAN_IFACE}

# Proxy all LAN host addresses on mobile interface
# In production use ndppd
ip -6 neigh add proxy 2001:db8:1::10 dev ${MOBILE_IFACE}
ip -6 neigh add proxy 2001:db8:1::11 dev ${MOBILE_IFACE}
```

## Verification

```bash
# Verify proxy NDP is working
# Test: can an upstream host reach a downstream host?

# 1. Show proxy entries
ip -6 neigh show proxy

# 2. Capture NS/NA on WAN interface
tcpdump -i eth0 -n 'icmp6 and (ip6[40] == 135 or ip6[40] == 136)' -v

# 3. Check if proxy NAs are sent
# Look for NA from router's MAC on behalf of downstream host's IPv6 addr

# 4. ndppd statistics
ndppd-status  # If available
journalctl -u ndppd | grep proxy
```

## Conclusion

NDP Proxy enables IPv6 connectivity across routed boundaries where devices on different interfaces share the same prefix. The Linux kernel implements it with `proxy_ndp=1` and `ip -6 neigh add proxy`. For automatic proxy entry management across entire prefixes, `ndppd` provides rule-based proxying. In VXLAN environments, NDP proxy combined with `neigh_suppress` on bridges reduces broadcast NDP traffic significantly. NDP Proxy is particularly important for delegated prefix scenarios where ISPs assign a prefix through a point-to-point link.
