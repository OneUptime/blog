# How to Set Up SSH Dynamic Port Forwarding as a SOCKS5 Proxy (-D)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, SOCKS5, Dynamic Port Forwarding, IPv4, Proxy, Tunneling

Description: Configure SSH dynamic port forwarding (-D) to create a SOCKS5 proxy that routes all traffic through an IPv4 SSH server, enabling secure browsing and application proxying.

## Introduction

SSH dynamic port forwarding (`-D`) creates a SOCKS4/SOCKS5 proxy on a local TCP port. Unlike `-L` (specific destination) or `-R` (remote exposure), `-D` lets SOCKS-aware applications choose destinations dynamically; the SSH server makes outbound TCP connections on your behalf, effectively routing proxied TCP traffic through the server's egress address.

## Basic SOCKS5 Proxy Setup

```bash
# Create a SOCKS5 proxy on local port 1080

ssh -D 1080 user@203.0.113.10

# Force IPv4 for the SSH connection
ssh -4 -D 1080 user@203.0.113.10

# Background + no shell mode
ssh -4 -fN -D 1080 user@203.0.113.10
```

## Bind to Specific Local IPv4 Address

```bash
# Bind SOCKS5 proxy to specific local interface
# (machines that can reach 10.0.0.5 can use 10.0.0.5:1080 as proxy)
ssh -4 -fN -D 10.0.0.5:1080 user@203.0.113.10

# Allow all local interfaces (use carefully)
ssh -4 -fN -D 0.0.0.0:1080 user@203.0.113.10
```

## SSH Config for Persistent SOCKS Proxy

```bash
# ~/.ssh/config

Host socks-proxy
    HostName 203.0.113.10
    User proxyuser
    AddressFamily inet
    DynamicForward 1080    # Create SOCKS5 proxy on port 1080
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
```

```bash
# Start the SOCKS proxy
ssh -fN socks-proxy
```

## Using the SOCKS5 Proxy

Configure applications to route through the proxy:

```bash
# Test with curl and let the proxy resolve hostnames
curl --socks5-hostname 127.0.0.1:1080 http://ifconfig.me
# Should show the SSH server's outbound IP address

# GNU Wget does not support SOCKS proxies directly; use proxychains below.

# Use with git HTTP/HTTPS remotes
git config --global http.proxy socks5h://127.0.0.1:1080

# Use with Python requests (requires: python -m pip install "requests[socks]")
# proxies = {'http': 'socks5h://127.0.0.1:1080', 'https': 'socks5h://127.0.0.1:1080'}
# requests.get('http://example.com', proxies=proxies)
```

## Browser Configuration

For Firefox: Settings → Network Settings → Manual proxy → SOCKS5 Host: `127.0.0.1` Port: `1080`. Enable "Proxy DNS when using SOCKS v5" if you want DNS lookups to use the tunnel.

```bash
# Or start a Chrome instance with the SOCKS proxy:
google-chrome --proxy-server="socks5://127.0.0.1:1080" &
```

## Routing Specific Tools Through SOCKS

Use `proxychains` or `tsocks` for applications without native SOCKS support:

```bash
# Install proxychains
sudo apt install proxychains4

# Configure: /etc/proxychains4.conf
# socks5 127.0.0.1 1080

# Run any command through the SOCKS proxy
proxychains4 curl http://ifconfig.me
proxychains4 wget http://example.com/
proxychains4 nmap -sT -Pn 192.168.1.0/24
```

## Monitoring SOCKS Proxy Connections

```bash
# Check local SOCKS port is listening
ss -tlnp | grep :1080

# See SSH process for the tunnel
ps aux | grep 'ssh.*-D.*1080'

# Monitor traffic through the proxy
sudo tcpdump -i lo port 1080 -n
```

## Conclusion

SSH dynamic port forwarding (`-D`) creates a SOCKS4/SOCKS5 proxy by opening a local TCP port that tunnels proxied TCP connections through the SSH server. Use `-fN` for background operation, configure `~/.ssh/config` for reusable proxy entries, and use `proxychains` to route non-SOCKS-aware applications. The server's `AllowTcpForwarding yes` setting is required (enabled by default).
