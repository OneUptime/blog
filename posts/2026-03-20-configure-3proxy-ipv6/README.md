# How to Configure 3proxy for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: 3proxy, Proxy, IPv6, SOCKS5, HTTP, Dual-Stack, Lightweight

Description: Configure 3proxy - a lightweight proxy server - to listen on IPv6 addresses, support SOCKS5 and HTTP proxy protocols for IPv6 clients, and chain through upstream IPv6 proxies.

## Introduction

3proxy is a tiny but powerful proxy server that supports HTTP, HTTPS, SOCKS4, and SOCKS5 protocols. It supports IPv6 natively and is commonly used for lightweight proxy deployments, testing, and dual-stack environments.

## Installation

```bash
# Build from source

git clone https://github.com/3proxy/3proxy.git
cd 3proxy
make -f Makefile.Linux
cp bin/3proxy /usr/local/bin/

# Or via package manager (some distros)
apt-get install -y 3proxy
```

## Step 1: Basic IPv6 Configuration

```nginx
# /etc/3proxy/3proxy.cfg

# Log with timestamps
log /var/log/3proxy/3proxy.log D

# Use IPv6 DNS servers
nserver 2606:4700:4700::1111
nserver 2606:4700:4700::1001

# Set maximum connections
maxconn 512

# Authentication (optional - allow all for local use)
auth none

# Allow all users
allow *

# HTTP proxy on IPv6
proxy -6 -p8080 -i::

# SOCKS5 proxy on IPv6
socks -6 -p1080 -i::

# Or bind to specific IPv6 address
# proxy -6 -p8080 -i2001:db8::10
```

## Step 2: Authentication

```nginx
# /etc/3proxy/3proxy.cfg

# Use username/password authentication
auth strong

# User list
users proxyuser:CL:password123

# Allow authenticated users
allow proxyuser

# Proxy
proxy -6 -p8080 -i:: -a
```

## Step 3: Upstream Proxy Chaining over IPv6

```nginx
# /etc/3proxy/3proxy.cfg

# Apply parent rule to allowed traffic
allow *

# Chain through upstream SOCKS5 on IPv6
parent 1000 socks5 2001:db8::20 1080 username password

# Or replace the parent line above with an HTTP CONNECT parent
# parent 1000 connect 2001:db8::30 3128

# proxy
proxy -6 -p8080 -i::
```

## Step 4: Restrict to IPv6 Clients Only

```nginx
# /etc/3proxy/3proxy.cfg

# Define ACL for IPv6 clients
auth iponly

# Allow only from internal IPv6
allow * 2001:db8::/32

# Deny everything else
deny *

# Listen on specific interface
proxy -6 -p8080 -i2001:db8::10
```

## Step 5: Systemd Service

```ini
# /etc/systemd/system/3proxy.service
[Unit]
Description=3proxy IPv6 proxy server
After=network.target

[Service]
ExecStart=/usr/local/bin/3proxy /etc/3proxy/3proxy.cfg
Restart=on-failure
User=proxy

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now 3proxy

# Verify
ss -lntp | grep :8080
ss -lntp | grep :1080

# Test HTTP proxy over IPv6
curl -6 -x http://[::1]:8080 http://example.com/

# Test SOCKS5 proxy over IPv6
curl -6 --socks5 [::1]:1080 http://example.com/
```

## Conclusion

3proxy listens on IPv6 by binding an IPv6 address with `-i::` (all interfaces) or a specific address. The `-6` flag makes 3proxy resolve upstream destinations as IPv6-only. Both HTTP and SOCKS5 proxies can listen on IPv6 in the same configuration file. Use upstream parent proxy chaining for multi-hop IPv6 proxy architectures. Monitor 3proxy availability with OneUptime's TCP connectivity checks on port 1080 and 8080.
