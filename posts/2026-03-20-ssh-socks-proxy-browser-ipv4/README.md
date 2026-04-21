# How to Route Browser Traffic Through an SSH SOCKS Proxy on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, SOCKS Proxy, IPv4, Tunneling, Browser, Security, Networking

Description: Learn how to create an SSH SOCKS5 proxy to tunnel browser traffic over an IPv4 SSH connection, bypassing network restrictions and encrypting traffic.

---

An SSH SOCKS proxy creates an encrypted tunnel between your machine and a remote server. By configuring your browser to use this proxy, browser traffic is relayed through the remote server's public egress address - useful for accessing region-restricted content or securing traffic on untrusted networks.

## Creating the SOCKS Proxy

```bash
# Start a SOCKS5 proxy on local port 1080, tunneled through the SSH server

# -D: dynamic application-level port forwarding (SOCKS)
# -C: compress traffic (optional, helps on slow connections)
# -f: run in background
# -N: don't execute a remote command (tunnel only)
ssh -D 1080 -C -fN user@ssh.example.com

# Force IPv4 for the SSH connection itself
ssh -4 -D 1080 -C -fN user@ssh.example.com
```

## Verifying the Proxy is Running

```bash
# Confirm the SOCKS proxy is listening on localhost:1080
ss -tlnp | grep 1080

# Quick connectivity test
curl --socks5-hostname localhost:1080 http://example.com
curl --socks5-hostname localhost:1080 https://ifconfig.me
# Should show the remote server's public egress address
```

## Configuring Firefox

1. Open **Settings** → **Network Settings** → **Manual proxy configuration**.
2. Set **SOCKS Host**: `127.0.0.1`, **Port**: `1080`, **SOCKS v5**.
3. Check **Proxy DNS when using SOCKS v5** to route DNS queries through the tunnel too.

## Configuring Chrome (via CLI)

```bash
# Launch Chrome with SOCKS proxy configured
google-chrome --proxy-server="socks5://127.0.0.1:1080" \
              --host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE localhost"
```

## CLI SOCKS Proxy Environment Variables (Linux)

```bash
# Set SOCKS proxy environment variables for CLI tools
export ALL_PROXY=socks5h://127.0.0.1:1080
export all_proxy=socks5h://127.0.0.1:1080

# Test with curl using the environment variable
curl https://ifconfig.me
```

## SSH Config for Easy Proxy Setup

```bash
# ~/.ssh/config
Host proxy-tunnel
    HostName ssh.example.com
    User admin
    AddressFamily inet         # Force IPv4 SSH connection
    DynamicForward 1080        # SOCKS5 proxy on local port 1080
    Compression yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

```bash
# Start the proxy using the named config entry
ssh -fN proxy-tunnel
```

## Stopping the Tunnel

```bash
# Find and kill the background SSH tunnel process
pkill -f "ssh.*-D 1080"

# Or find the PID and kill it
ps aux | grep "ssh -D"
kill <PID>
```

## Key Takeaways

- `ssh -D 1080` creates a SOCKS5 proxy listening on `localhost:1080`.
- Use `-4` to force the SSH connection itself over IPv4.
- Configure the browser's SOCKS proxy to `127.0.0.1:1080` and enable "Proxy DNS" to prevent DNS leaks.
- `ALL_PROXY=socks5h://127.0.0.1:1080` routes tools that honor proxy environment variables through the tunnel without per-tool configuration.
