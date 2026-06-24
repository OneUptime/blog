# How to Use SSH as a SOCKS Proxy for Tunneling IPv4 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, SOCKS Proxy, IPv4, Tunneling, Port Forwarding, Security

Description: Use SSH dynamic port forwarding to create a SOCKS5 proxy that tunnels IPv4 traffic through an SSH connection to a remote server, bypassing network restrictions.

## Introduction

SSH dynamic port forwarding creates a SOCKS proxy on your local machine for TCP connections. Traffic sent to the local SOCKS port is forwarded through the SSH tunnel to the remote server, which makes the requests on your behalf. This is useful for accessing resources on a remote network or bypassing local restrictions.

## Basic SSH SOCKS Proxy

```bash
# Create a SOCKS5 proxy on local port 1080, tunnel through remote SSH server

ssh -D 1080 -f -C -q -N user@remote-server.example.com

# Options:
# -D 1080    Create dynamic (SOCKS) tunnel on local port 1080
# -f         Fork to background
# -C         Enable compression
# -q         Quiet mode
# -N         No command (just forward ports)
```

## Bind to a Specific Local IPv4 Address

```bash
# Only listen on 127.0.0.1 (secure - local only)
ssh -D 127.0.0.1:1080 -f -N user@remote-server.example.com

# Listen on all interfaces (allow other machines on your LAN to use the proxy)
ssh -D 0.0.0.0:1080 -f -N user@remote-server.example.com
```

## Using the SOCKS Proxy

```bash
# curl via the SOCKS5 proxy
curl --socks5 127.0.0.1:1080 https://example.com

# curl with DNS through the proxy (prevent DNS leak)
curl --socks5-hostname 127.0.0.1:1080 https://example.com

# Test what IP the remote server sees
curl --socks5-hostname 127.0.0.1:1080 https://icanhazip.com
# Should return the remote server's public egress IP
```

## Persistent SSH Tunnel with AutoSSH

```bash
sudo apt-get install -y autossh

# Start an autoreconnecting tunnel
autossh -M 0 -D 1080 -f -N \
  -o "ServerAliveInterval 30" \
  -o "ServerAliveCountMax 3" \
  -o "ExitOnForwardFailure yes" \
  -i ~/.ssh/id_rsa \
  user@remote-server.example.com
```

## systemd Service for Persistent Tunnel

```ini
# /etc/systemd/system/ssh-socks-tunnel.service

[Unit]
Description=SSH SOCKS Proxy Tunnel
After=network.target

[Service]
User=your-user
ExecStart=/usr/bin/ssh \
  -D 127.0.0.1:1080 \
  -N \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=accept-new \
  -i /home/your-user/.ssh/tunnel_key \
  user@remote-server.example.com
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ssh-socks-tunnel
```

## Configuring Applications to Use the Tunnel

```bash
# Git (HTTP and HTTPS remotes)
git config --global http.proxy 'socks5://127.0.0.1:1080'

# npm
npm config set proxy 'socks5://127.0.0.1:1080'
npm config set https-proxy 'socks5://127.0.0.1:1080'

# Python (using PySocks)
pip install pysocks
python3 -c "
import socks, socket
socks.set_default_proxy(socks.SOCKS5, '127.0.0.1', 1080)
socket.socket = socks.socksocket
import urllib.request
print(urllib.request.urlopen('https://icanhazip.com').read())
"
```

## ProxyChains for TCP Applications

```bash
sudo apt-get install -y proxychains4

# /etc/proxychains4.conf
# Comment out socks4 127.0.0.1 9050, add:
# socks5 127.0.0.1 1080

# Use compatible TCP applications through the SOCKS proxy
proxychains4 curl https://example.com
proxychains4 nmap -sT -Pn 10.0.2.0/24
```

## Forwarding Multiple Local Ports

Combine SOCKS with static port forwards:

```bash
ssh -D 1080 \
    -L 5432:db-server:5432 \
    -L 6379:redis-server:6379 \
    -N user@remote-server.example.com
```

## Conclusion

SSH dynamic forwarding (`-D port`) creates a SOCKS proxy for TCP connections on your local machine. Use `-f -N` to run it in the background. Use `--socks5-hostname` with curl to prevent DNS leaks. For production persistent tunnels, use autossh or a systemd service with `Restart=always`. Always prefer key-based authentication for tunnel accounts.
