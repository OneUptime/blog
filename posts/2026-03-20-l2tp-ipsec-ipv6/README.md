# How to Configure L2TP/IPsec with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: L2TP, IPsec, IPv6, VPN, Xl2tpd, Tunneling

Description: A guide to configuring L2TP/IPsec VPN with IPv6 support using xl2tpd and strongSwan/Libreswan on Linux.

L2TP (Layer 2 Tunneling Protocol) over IPsec is a common VPN protocol supported natively by Windows, macOS, iOS, and Android clients without additional software. While L2TP/IPsec has limitations compared to modern alternatives, PPP inside the L2TP session can negotiate IPv6, although routable IPv6 requires additional routing or prefix configuration.

## Architecture

```text
Client → IPsec (transport mode over IPv4) → L2TP tunnel → PPP session carrying IPv4 and optional IPv6
```

L2TP/IPsec typically runs over IPv4 for the outer transport, while PPP inside the L2TP session can negotiate IPv6. Without additional routing or prefix delegation, this usually results in IPv6CP link-local connectivity rather than routed global IPv6 addresses.

## Installing Components

```bash
# Debian/Ubuntu

sudo apt-get install xl2tpd strongswan

# RHEL/CentOS
sudo dnf install xl2tpd libreswan
```

## IPsec Configuration (strongSwan legacy `ipsec.conf` backend)

```conf
# /etc/ipsec.conf

config setup
    charondebug="ike 2, knl 1"

conn L2TP-PSK
    keyexchange=ikev1
    authby=secret
    type=transport

    left=%any
    leftprotoport=17/1701    # L2TP uses UDP 1701

    right=%any
    rightprotoport=17/%any

    auto=add
```

```bash
# /etc/ipsec.secrets
%any %any : PSK "your-pre-shared-key"
```

## xl2tpd Configuration

```ini
# /etc/xl2tpd/xl2tpd.conf

[global]
listen-addr = 0.0.0.0

[lns default]
ip range = 192.168.42.10-192.168.42.50
local ip = 192.168.42.1
require chap = yes
refuse pap = yes
require authentication = yes
ppp debug = yes
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
```

## PPP Configuration with IPv6

```ini
# /etc/ppp/options.xl2tpd

refuse-pap
refuse-chap
refuse-mschap
require-mschap-v2
name xl2tpd

# IPv4 settings
ms-dns 8.8.8.8
ms-dns 8.8.4.4

# Enable IPv6CP in PPP
+ipv6

# IPv6 DNS
# ms-dns6 2001:4860:4860::8888   # pppd does not provide an ms-dns6 option

mtu 1280
mru 1280
noccp
nodefaultroute
proxyarp
logfile /var/log/xl2tpd.log
```

## CHAP Secrets (User Credentials)

```bash
# /etc/ppp/chap-secrets
# username  server  password  allowed-addresses
client1  xl2tpd  "password123"  *
client2  xl2tpd  "password456"  *
```

## Starting Services

```bash
# Start IPsec
sudo systemctl start strongswan-starter    # Debian/Ubuntu strongSwan ipsec.conf backend
sudo systemctl enable strongswan-starter
# On Libreswan-based systems:
# sudo systemctl start ipsec
# sudo systemctl enable ipsec

# Start L2TP daemon
sudo systemctl start xl2tpd
sudo systemctl enable xl2tpd

# Verify both are running
sudo ipsec status
sudo systemctl status xl2tpd
```

## Firewall Rules

```bash
# Allow IPsec and L2TP
sudo iptables -A INPUT -p udp --dport 500 -j ACCEPT    # IKE
sudo iptables -A INPUT -p udp --dport 4500 -j ACCEPT   # NAT-T
sudo iptables -A INPUT -p udp --dport 1701 -j ACCEPT   # L2TP
sudo iptables -A INPUT -p esp -j ACCEPT                 # IPsec ESP

# Allow IPv6 through the L2TP interface
sudo ip6tables -A FORWARD -i ppp+ -j ACCEPT
sudo ip6tables -A FORWARD -o ppp+ -j ACCEPT
```

## IPv6 Limitations with L2TP/IPsec

L2TP/IPsec was designed primarily for IPv4. IPv6 support depends on:
- PPP's `+ipv6` option (enables IPv6CP; by itself this typically only gives link-local IPv6)
- The client's ability to accept IPv6 over PPP
- Configuration management being more complex than modern VPNs

**Recommendation**: For new deployments, prefer WireGuard or IKEv2/IPsec (without L2TP) for better IPv6 support, performance, and security. L2TP/IPsec is primarily useful when you must support legacy clients that only speak L2TP/IPsec natively.
