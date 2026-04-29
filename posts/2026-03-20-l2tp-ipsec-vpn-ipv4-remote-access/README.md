# How to Set Up L2TP/IPSec VPN for IPv4 Remote Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: L2TP, IPsec, VPN, IPv4, Linux, Remote Access

Description: Configure an L2TP/IPSec VPN server on Linux using xl2tpd and StrongSwan for IPv4 remote access compatible with native Windows and macOS clients.

L2TP/IPSec combines the L2TP tunneling protocol with IPSec encryption, and is natively supported by Windows, macOS, iOS, and Android without additional software.

## Step 1: Install Required Packages

```bash
sudo apt update
sudo apt install strongswan xl2tpd ppp -y
```

## Step 2: Configure StrongSwan for L2TP

```conf
# /etc/ipsec.conf

conn L2TP-PSK
    authby=secret
    auto=add
    keyingtries=3
    rekey=no
    ikelifetime=8h
    keylife=1h
    type=transport
    left=%defaultroute
    leftprotoport=17/1701
    right=%any
    rightprotoport=17/%any
    keyexchange=ikev1
    ike=aes256-sha1-modp1024,aes128-sha1-modp1024,3des-sha1-modp1024
    esp=aes256-sha1,aes128-sha1,3des-sha1
```

```conf
# /etc/ipsec.secrets

%any %any : PSK "YourPresharedKey"
```

## Step 3: Configure xl2tpd

```conf
# /etc/xl2tpd/xl2tpd.conf

[global]
ipsec saref = no

[lns default]
ip range = 192.168.42.10-192.168.42.250
local ip = 192.168.42.1
require chap = yes
refuse pap = yes
require authentication = yes
hostname = L2TPVPN
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
```

## Step 4: Configure PPP Options

```conf
# /etc/ppp/options.xl2tpd

ipcp-accept-local
ipcp-accept-remote
ms-dns 8.8.8.8
ms-dns 8.8.4.4
name L2TPVPN
noccp
auth
crtscts
hide-password
modem
# Maximum transmission unit
mtu 1280
mru 1280
lock
connect-delay 5000
```

## Step 5: Add L2TP Users

```conf
# /etc/ppp/chap-secrets
# Username  Server  Password  IP
alice    L2TPVPN  "password1"  *
bob      L2TPVPN  "password2"  *
```

## Step 6: Enable NAT and Forwarding

```bash
sudo sysctl -w net.ipv4.ip_forward=1

# NAT for L2TP clients
sudo iptables -t nat -A POSTROUTING -s 192.168.42.0/24 -o eth0 -j MASQUERADE

# Allow L2TP and IPSec
sudo iptables -A INPUT -p udp --dport 500 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 4500 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 1701 -j ACCEPT
sudo iptables -A INPUT -p esp -j ACCEPT
```

## Step 7: Start Services

```bash
sudo systemctl restart strongswan-starter
sudo systemctl enable strongswan-starter
sudo systemctl restart xl2tpd
sudo systemctl enable xl2tpd
```

## Connecting from Windows

1. Go to Settings → Network & Internet → VPN → Add a VPN connection
2. Set VPN type to **L2TP/IPSec with pre-shared key**
3. Enter the server IP and the PSK from `/etc/ipsec.secrets`
4. Enter your username and password from `chap-secrets`

Note: L2TP/IPSec relies on IKEv1, which is now officially deprecated. For new deployments, prefer a pure StrongSwan IKEv2 setup, which is more modern and secure.
