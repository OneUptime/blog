# How to Configure SOCKS5 Proxy for IPv4 Traffic with Dante

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SOCKS5, Dante, Proxy, IPv4, Networking, TCP

Description: Install and configure Dante as a SOCKS5 proxy server for IPv4 traffic, with client authentication, access control by source IP, and connection restrictions.

## Introduction

Dante is a free SOCKS server implementation supporting SOCKS4 and SOCKS5 protocols. SOCKS5 supports TCP and UDP proxying and optional username/password authentication. Unlike HTTP proxies, SOCKS5 is protocol-agnostic - it can proxy any TCP or UDP application.

## Installing Dante

```bash
sudo apt-get update
sudo apt-get install -y dante-server
```

## Basic Dante Configuration (No Authentication)

```text
# /etc/danted.conf

# Log settings

logoutput: /var/log/danted.log

# Server external interface (connects to internet)
external: eth0

# Server internal interface (clients connect here)
internal: eth1 port = 1080

# Authentication method (none = no auth)
clientmethod: none

# SOCKS authentication method
socksmethod: none username

# Client rules (who can connect to Dante)
client pass {
    from: 10.0.1.0/24 to: 0.0.0.0/0
    log: connect disconnect error
}

# SOCKS rules (what traffic can be forwarded)
socks pass {
    from: 10.0.1.0/24 to: 0.0.0.0/0
    protocol: tcp udp
    log: connect disconnect error
}
```

## Configuration with Username/Password Authentication

```text
# /etc/danted.conf

logoutput: /var/log/danted.log

external: eth0
internal: 0.0.0.0 port = 1080

clientmethod: none

# Require username/password authentication for SOCKS
socksmethod: username

client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
}

socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    protocol: tcp
    socksmethod: username
}

socks block {
    from: 0.0.0.0/0 to: 0.0.0.0/0
    log: connect error
}
```

Create system users for authentication:

```bash
# Add proxy users (no login shell for security)
sudo useradd -r -s /sbin/nologin proxyuser1
sudo passwd proxyuser1

sudo useradd -r -s /sbin/nologin proxyuser2
sudo passwd proxyuser2
```

Dante's `socksmethod: username` reads the system password files (`/etc/passwd`/`/etc/shadow`) directly. For PAM-based authentication, use `socksmethod: pam.username` instead.

## Start Dante

```bash
sudo systemctl enable danted
sudo systemctl start danted

# Check it's listening
sudo ss -tlnp | grep danted
```

## Restricting Access by Destination

```text
# Block access to private RFC 1918 ranges
socks block {
    from: 0.0.0.0/0 to: 192.168.0.0/16
    log: connect
}

socks block {
    from: 0.0.0.0/0 to: 10.0.0.0/8
    log: connect
}

socks block {
    from: 0.0.0.0/0 to: 172.16.0.0/12
    log: connect
}

socks pass {
    from: 10.0.1.0/24 to: 0.0.0.0/0
    protocol: tcp
}
```

## Testing the SOCKS5 Proxy

```bash
# Test with curl using SOCKS5
curl --socks5 10.0.1.5:1080 http://example.com

# Test with authentication
curl --socks5 proxyuser1:password@10.0.1.5:1080 http://example.com

# Test with socksify (dante-client)
sudo apt-get install -y dante-client
# Configure /etc/socks.conf then:
socksify curl http://example.com
```

## Client Configuration Examples

```bash
# Git
git config --global http.proxy socks5://10.0.1.5:1080

# SSH via SOCKS5
ssh -o ProxyCommand="nc -X 5 -x 10.0.1.5:1080 %h %p" user@remote-host

# Firefox/Chrome: Set SOCKS5 proxy to 10.0.1.5:1080 in network settings

# Python requests library
import requests
proxies = {'http': 'socks5://proxyuser1:pass@10.0.1.5:1080',
           'https': 'socks5://proxyuser1:pass@10.0.1.5:1080'}
r = requests.get('https://example.com', proxies=proxies)
```

## Viewing Logs

```bash
sudo tail -f /var/log/danted.log
```

## Conclusion

Dante SOCKS5 proxy uses `socksmethod: username` for authentication with system users. Define `client pass` rules for who can connect, and `socks pass`/`socks block` rules for what destinations are reachable. Test with `curl --socks5 host:port`. SOCKS5 is protocol-agnostic, making it useful for proxying SSH, FTP, database connections, and other non-HTTP protocols.
