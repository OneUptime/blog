# How to Configure IPv6 on Wi-Fi Access Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Wi-Fi, Access Point, SLAAC, DHCPv6, Wireless, 802.11

Description: Configure IPv6 on Wi-Fi access points including enabling router advertisement forwarding, SLAAC, DHCPv6 relay, and proper IPv6 prefix delegation for wireless clients.

---

Wi-Fi access points bridge wireless clients to the wired network. On a normal bridged AP, IPv6 Router Advertisement (RA), DHCPv6, and NDP traffic passes transparently at Layer 2; if the AP routes between interfaces, you may need DHCPv6 relay or NDP proxy/relay, and the access point's management interface should support IPv6.

## How IPv6 Works on Wi-Fi Networks

```text
IPv6 Wi-Fi Architecture:
Internet
    |
[Router] 2001:db8:1::/64 prefix, RA daemon
    |
[Switch]
    |
[Access Point] - bridges L2, passes RA/DHCPv6/NDP
    |
[Wi-Fi Clients] - receive RA, configure SLAAC addresses
  2001:db8:1::101/64 (auto-configured)
  2001:db8:1::102/64 (auto-configured)
```

## Enable IPv6 Management on Access Point (Generic Linux-Based AP)

```bash
# Many APs run embedded Linux - configure via SSH

# Example static IPv6 management address on the wireless bridge

ip -6 addr add 2001:db8:1::2/64 dev br0
ip -6 route add default via 2001:db8:1::1 dev br0

# Enable IPv6 forwarding (if AP acts as router)
sysctl -w net.ipv6.conf.all.forwarding=1
sysctl -w net.ipv6.conf.br0.forwarding=1

# Persist across reboots
echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
```

## OpenWrt Access Point IPv6

```bash
# OpenWrt UCI configuration for IPv6 on a bridged AP

# For a bridged AP, give the AP itself IPv6 without requesting a delegated prefix
uci set network.lan6=interface
uci set network.lan6.proto='dhcpv6'
uci set network.lan6.device='@lan'
uci set network.lan6.reqaddress='try'
uci set network.lan6.reqprefix='no'

# Let the upstream router provide RA/DHCPv6 on br-lan
uci set dhcp.lan.dhcpv6='disabled'
uci set dhcp.lan.ra='disabled'
uci set dhcp.lan.ndp='disabled'

uci commit dhcp
uci commit network

# Restart services
/etc/init.d/network reload
/etc/init.d/odhcpd restart

# Verify IPv6 on AP
ip -6 addr show br-lan
ip -6 route show
```

```bash
# Routed relay mode when no upstream prefix delegation is available
uci set dhcp.lan.dhcpv6='relay'
uci set dhcp.lan.ra='relay'
uci set dhcp.lan.ndp='relay'
uci set dhcp.wan6.dhcpv6='relay'
uci set dhcp.wan6.ra='relay'
uci set dhcp.wan6.ndp='relay'
uci set dhcp.wan6.master='1'
uci set dhcp.wan6.interface='wan6'

uci commit dhcp
/etc/init.d/odhcpd restart
```

## Verify IPv6 Client Addressing on Wi-Fi

```bash
# Check which wireless clients are associated (on OpenWrt/hostapd AP)
iw dev wlan0 station dump | grep Station

# Check the NDP table for wireless clients
ip -6 neigh show dev br-lan

# Show DHCPv6 leases (SLAAC addresses are not recorded in DHCP lease files)
# On the AP running odhcpd:
ubus call dhcp ipv6leases

# On Linux with dnsmasq
cat /var/lib/misc/dnsmasq.leases

# Test IPv6 reachability from AP to a client
ping6 2001:db8:1::1234 -I br-lan
```

## Enable IPv6 NDP Proxy (for Routed APs Without Prefix Delegation)

```bash
# A pure bridge does not need proxying; it passes RA/DHCPv6/NDP at Layer 2.
# Use NDP proxy only when the AP/router is routing between interfaces and the
# upstream does not delegate a separate prefix.
# Pair this with RA/DHCPv6 relay or a downstream RA server for client
# configuration.

# On upstream Linux router: enable NDP proxy
sysctl -w net.ipv6.conf.eth0.proxy_ndp=1

# Add NDP proxy entries for wireless clients
ip -6 neigh add proxy 2001:db8:1::101 dev eth0

# Or use ndppd for dynamic NDP proxying
# Install ndppd
apt install ndppd -y

# /etc/ndppd.conf
cat > /etc/ndppd.conf << 'EOF'
proxy eth0 {
    rule 2001:db8:1::/64 {
        auto
    }
}
EOF

systemctl enable --now ndppd
```

## Firewall Rules for Wi-Fi IPv6 Clients

```bash
# If the AP routes IPv6, or if bridged IPv6 traffic is passed through ip6tables,
# allow ICMPv6 (required for SLAAC/NDP)
sudo ip6tables -A FORWARD -p icmpv6 -j ACCEPT

# Allow DHCPv6 relay
sudo ip6tables -A INPUT -p udp --dport 547 -j ACCEPT
sudo ip6tables -A FORWARD -p udp --dport 546 -j ACCEPT

# Allow Wi-Fi clients to reach internet
sudo ip6tables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
sudo ip6tables -A FORWARD -i eth0 -o wlan0 \
  -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Save rules
sudo sh -c 'ip6tables-save > /etc/ip6tables/rules.v6'
```

## Verify End-to-End IPv6 for Wi-Fi Clients

```bash
# From a connected Wi-Fi client, verify IPv6
ip -6 addr show          # Should show global IPv6 address
ip -6 route show default # Should have a default route via the upstream router
ping6 2606:4700:4700::1111  # Cloudflare DNS over IPv6
curl -6 https://ipv6.google.com  # IPv6 web access

# From the AP, check RA is present on the wireless side
radvdump  # Listen for RA messages on the wireless interface

# On OpenWrt, verify delegated prefixes on the upstream router or routing AP
ifstatus wan6
```

IPv6 on Wi-Fi access points centers on making sure bridged APs transparently pass RA, DHCPv6, and NDP between wired and wireless segments. If the AP is routing and no delegated prefix is available, use RA/DHCPv6 relay together with NDP proxy or relay; otherwise let the upstream router advertise prefixes directly to clients for SLAAC.
