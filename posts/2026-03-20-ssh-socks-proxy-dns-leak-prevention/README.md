# How to Set Up an SSH SOCKS Proxy with DNS Leak Prevention on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, SOCKS5, DNS Leak, IPv4, Privacy, Security, Proxy

Description: Configure an SSH SOCKS5 proxy that prevents DNS leaks by routing DNS queries through the proxy, ensuring all IPv4 traffic including name resolution goes through the SSH server.

## Introduction

A DNS leak occurs when your browser sends DNS queries directly to your ISP's resolver while other traffic goes through the SOCKS proxy. This reveals which domains you're accessing even if the content is tunneled. SOCKS5 with remote DNS resolution prevents this.

## Setting Up the SSH SOCKS Proxy

```bash
# Create SOCKS5 proxy
# Replace 203.0.113.10 with your SSH server's public IPv4 address

ssh -4 -fN -D 127.0.0.1:1080 user@203.0.113.10
```

## Preventing DNS Leaks with SOCKS5 Remote DNS

Clients such as curl use `socks5h` (SOCKS5 with hostname resolution), which sends hostnames to the proxy server rather than resolving them locally:

```bash
# Test: use curl with socks5h (hostname resolved by SSH server)
curl --socks5-hostname 127.0.0.1:1080 http://httpbin.org/ip
# All DNS resolution happens via the SSH server, not locally
```

## Firefox DNS Leak Prevention

Configure Firefox to use SOCKS5 with remote DNS:

```text
Settings → Network Settings → Manual proxy configuration
SOCKS Host: 127.0.0.1   Port: 1080
SOCKS v5: selected
☑ Proxy DNS when using SOCKS v5   ← This prevents DNS leaks
```

Or set in `about:config`:
```text
network.proxy.type: 1
network.proxy.socks: 127.0.0.1
network.proxy.socks_port: 1080
network.proxy.socks_version: 5
network.proxy.socks_remote_dns: true   ← Key setting
```

## System-Wide DNS Leak Prevention with dnscrypt-proxy

Route DNS through the proxy using `dnscrypt-proxy` via SOCKS5, then point your system resolver at `127.0.0.1`:

```bash
# Install dnscrypt-proxy
sudo apt install dnscrypt-proxy
```

```toml
# Configure to use the SOCKS5 proxy for upstream DNS
# /etc/dnscrypt-proxy/dnscrypt-proxy.toml
listen_addresses = ['127.0.0.1:53']
force_tcp = true
proxy = 'socks5://127.0.0.1:1080'
```

```bash
# Restart dnscrypt-proxy
sudo systemctl restart dnscrypt-proxy
```

## Chromium DNS Leak Prevention

```bash
# Run Chromium with SOCKS proxy and remote DNS
chromium-browser \
  --proxy-server="socks5://127.0.0.1:1080" \
  --host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE localhost" \
  --proxy-bypass-list="<-loopback>" &

# This prevents Chromium from doing local DNS resolution for proxied URL loads
```

## Verifying No DNS Leaks

```bash
# Test 1: Check exit IP
curl --socks5-hostname 127.0.0.1:1080 http://ifconfig.me
# Should show your SSH server's public IPv4 address

# Test 2: Check DNS resolution origin in the proxied browser
# Open https://dnsleaktest.com/ in Firefox or Chromium configured above and run the extended test

# Test 3: Check that dnscrypt-proxy answers on its local listener
dig +short @127.0.0.1 example.com A
# Should return an IP address without using your normal local resolver

# Test 4: tcpdump to verify no local DNS queries
IFACE=$(ip route get 1.1.1.1 | awk '{for (i=1; i<=NF; i++) if ($i=="dev") {print $(i+1); exit}}')
sudo tcpdump -i "$IFACE" 'port 53' -n
# Should see NO DNS traffic on your external interface while using socks5-hostname
```

## SSH Config for Privacy-Focused SOCKS

```text
# ~/.ssh/config
Host privacy-proxy
    HostName 203.0.113.10
    User proxyuser
    AddressFamily inet
    DynamicForward 127.0.0.1:1080
    ServerAliveInterval 30
    ServerAliveCountMax 3
    # DNS resolution happens on the server side
```

## Conclusion

DNS leak prevention with an SSH SOCKS proxy requires two things: using `socks5h` mode (hostname resolution by proxy, not locally) and configuring your applications to use it. For browsers, enable `Proxy DNS when using SOCKS v5`. For CLI tools, use `--socks5-hostname` instead of `--socks5`. Verify with DNS leak tests to confirm proxied DNS queries originate from the SSH server's IPv4 address.
