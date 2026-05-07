# How to Set Up 464XLAT for Mobile Network IPv6 Transition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: 464XLAT, IPv6, IPv4, Mobile Networks, CLAT, PLAT, Transition

Description: Configure 464XLAT on mobile networks by setting up PLAT (NAT64 on the carrier side) and CLAT (stateless translation on the device side) to allow IPv4 applications to function over IPv6-only mobile...

## Introduction

464XLAT (RFC 6877) enables IPv4 applications to work over IPv6-only mobile networks. It uses two translation components: PLAT (Provider-side Translator, a NAT64 gateway) and CLAT (Customer-side Translator, a stateless 1:1 translator on the device). The combination provides IPv4 service continuity over an IPv6-only access network.

## Architecture

```text
IPv4 App → CLAT (device) → IPv6 network → PLAT (carrier NAT64) → IPv4 Internet
           [stateless]       [IPv6 only]    [stateful NAT64]
```

- **CLAT**: Translates private IPv4 packets from the device to IPv6 using the discovered or configured Pref64::/n
- **PLAT**: Stateful NAT64 gateway that translates the IPv6 packets back to IPv4 for the public internet

## Setting Up PLAT (NAT64 Gateway)

The PLAT is typically a stateful NAT64 gateway running on the carrier infrastructure. In a Linux lab, TAYGA can provide the stateless translation component and be combined with IPv4 masquerading to model the PLAT path:

```bash
# Install TAYGA

sudo apt-get install tayga

# /etc/tayga.conf
tun-device nat64
ipv4-addr 203.0.113.1
ipv6-addr 2001:db8:1:ffff::1
prefix 64:ff9b::/96
dynamic-pool 203.0.113.0/24
data-dir /var/lib/tayga
```

```bash
# Create TUN interface and configure host-side addresses and routes
sudo tayga --mktun
sudo ip link set nat64 up
sudo ip addr add 192.0.2.1/24 dev nat64
sudo ip addr add 2001:db8:1::1/64 dev nat64

# Route the NAT64 prefix and dynamic IPv4 pool to TAYGA
sudo ip -6 route add 64:ff9b::/96 dev nat64
sudo ip route add 203.0.113.0/24 dev nat64

# Enable forwarding and masquerade translated IPv4 egress
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1
sudo iptables -t nat -A POSTROUTING -s 203.0.113.0/24 -o eth0 -j MASQUERADE

# Start TAYGA
sudo tayga
```

## Setting Up CLAT (Device-Side Translator)

The CLAT runs on the mobile device or CPE. On Linux, `clatd` is a common implementation:

```bash
# Install clatd
sudo apt-get install clatd

# /etc/clatd.conf
clat-dev=clat
# Match the PLAT prefix; many real networks auto-detect this via RFC 7050
plat-prefix=64:ff9b::/96
# IPv4 address for the CLAT interface (RFC 7335 service continuity prefix)
clat-v4-addr=192.0.0.1
```

```bash
# Start clatd
sudo clatd &

# clatd creates a 'clat' interface with the configured IPv4 address
ip addr show clat
# Expected: inet 192.0.0.1/32 scope global clat

# The default IPv4 route is set via the clat interface
ip route show
# Expected: default dev clat
```

## DNS64

DNS64 is commonly deployed alongside 464XLAT. It lets IPv6-capable applications reach IPv4-only destinations with a single NAT64 translation, and CLAT implementations often use it for Pref64::/n discovery:

```bash
# DNS64 server (Unbound)
# /etc/unbound/unbound.conf
server:
    interface: ::0
    do-ip6: yes
    do-ip4: yes

    module-config: "dns64 validator iterator"
    dns64-prefix: 64:ff9b::/96
```

If `plat-prefix` is configured manually, IPv4-literal traffic can still work through CLAT without DNS64, but IPv6-capable applications reaching IPv4-only destinations still need AAAA synthesis. Mobile devices typically use the carrier's DNS64 resolver automatically via the network's normal DNS provisioning.

## Verifying 464XLAT

```bash
# On a device with CLAT configured:

# Check CLAT interface is up
ip addr show clat

# Ping an IPv4-only host (should work via CLAT/PLAT)
ping 8.8.8.8

# Trace the path - on Linux clatd/TAYGA setups, the first hop is typically the translator's 192.0.0.2 address
traceroute 8.8.8.8

# Check that IPv6 connectivity is native
ping -6 2001:4860:4860::8888

# DNS lookup for ipv4only.arpa should return synthesized AAAA under the configured Pref64::/n
dig AAAA ipv4only.arpa @<dns64-server>
# Should embed 192.0.0.170 and 192.0.0.171 in the NAT64 prefix
```

## Android and iOS

Mobile operating systems support IPv6-only access natively:

- **Android**: Built-in CLAT via the userspace `clatd` component; activates automatically on IPv6-only networks and discovers the NAT64 prefix using mechanisms such as DNS64 and RFC 7050
- **iOS**: Supports IPv6-only DNS64/NAT64 networks; Apple requires App Store apps to work on IPv6-only networks

## Firewall on PLAT

```bash
# Allow PLAT to forward translated traffic
sudo ip6tables -A FORWARD -i eth0 -o nat64 -j ACCEPT
sudo ip6tables -A FORWARD -i nat64 -o eth0 -j ACCEPT

# Log translated IPv4 egress (optional, useful for troubleshooting)
sudo iptables -A FORWARD -i nat64 -o eth0 -s 203.0.113.0/24 -j LOG --log-prefix "CLAT-PLAT: "
```

## Conclusion

464XLAT enables IPv4 applications on IPv6-only mobile networks through two-component translation: CLAT on the device (stateless IP/ICMP translation) and PLAT in the carrier network (stateful NAT64). In Linux lab environments, `clatd` can provide the CLAT function, while TAYGA plus IPv4 masquerading can model the translation path on the provider side. DNS64 (via Unbound or BIND) is commonly deployed for AAAA synthesis and Pref64::/n discovery. Mobile OSes support IPv6-only operation natively, with Android including a built-in CLAT component and Apple requiring iOS apps to work on IPv6-only networks.
