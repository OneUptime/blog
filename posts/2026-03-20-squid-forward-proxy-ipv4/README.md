# How to Set Up Squid as a Forward Proxy for IPv4 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Forward Proxy, IPv4, HTTP, Proxy, Caching

Description: Install and configure Squid as a forward proxy server for IPv4 HTTP and HTTPS traffic, with basic access controls and client configuration.

## Introduction

Squid is a widely deployed caching proxy server. As a forward proxy, clients configure it as their HTTP proxy and Squid fetches resources on their behalf. This enables centralized internet access control, logging, and caching for organizations.

## Installing Squid

```bash
sudo apt-get update
sudo apt-get install -y squid
```

## Basic Squid Configuration

```text
# /etc/squid/squid.conf

# Port Squid listens on

http_port 3128

# Define trusted client networks
acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12
acl localnet src 192.168.0.0/16

# Define safe ports
acl SSL_ports port 443
acl Safe_ports port 80          # http
acl Safe_ports port 443         # https
acl Safe_ports port 21          # ftp
acl Safe_ports port 1025-65535  # unregistered ports

# Required CONNECT method for HTTPS tunneling
acl CONNECT method CONNECT

# Block CONNECT to non-SSL ports (security)
http_access deny CONNECT !SSL_ports

# Block requests to unsafe ports
http_access deny !Safe_ports

# Only allow cache manager access from localhost
http_access allow localhost manager
http_access deny manager

# Allow access from local networks
http_access allow localnet

# Deny everything else
http_access deny all

# Log location
access_log daemon:/var/log/squid/access.log logformat=squid
cache_log  /var/log/squid/cache.log

# Disk cache
cache_dir ufs /var/spool/squid 4096 16 256
```

## Start and Enable Squid

```bash
# Validate the configuration and initialize cache directories
sudo squid -k parse
sudo systemctl stop squid
sudo squid -z

sudo systemctl enable squid
sudo systemctl start squid

# Check status
sudo systemctl status squid

# Test Squid is listening
sudo ss -tlnp | grep squid
```

## Configuring Clients to Use the Proxy

### Linux (Environment Variables)

```bash
export http_proxy="http://10.0.1.5:3128"
export https_proxy="http://10.0.1.5:3128"
export no_proxy="localhost,127.0.0.1,10.0.0.0/8"

# Test
curl -I http://example.com
```

### Linux (apt)

```bash
# /etc/apt/apt.conf.d/95proxy
Acquire::http::Proxy "http://10.0.1.5:3128";
Acquire::https::Proxy "http://10.0.1.5:3128";
```

### Browser (Chrome/Firefox)

Set HTTP proxy to `10.0.1.5:3128` in browser network settings.

## Testing the Proxy

```bash
# Test HTTP proxy
curl -x http://10.0.1.5:3128 http://example.com -I

# Test HTTPS CONNECT (tunneling)
curl -x http://10.0.1.5:3128 https://example.com -I
```

## Viewing Access Logs

```bash
# Follow the access log in real time
sudo tail -f /var/log/squid/access.log

# Count requests per client IP
sudo awk '{print $3}' /var/log/squid/access.log | sort | uniq -c | sort -rn | head
```

## Squid Cache Statistics

```bash
curl -s http://127.0.0.1:3128/squid-internal-mgr/info | head -40
```

## Reload Configuration Without Restart

```bash
sudo squid -k reconfigure
```

## Conclusion

Squid forward proxy listens on port 3128 by default. Define ACLs for trusted client networks and safe ports, then use `http_access allow/deny` rules. Always deny `CONNECT` to non-SSL ports for security. Configure clients with `http_proxy` environment variables. Use `squidclient mgr:info` for cache statistics and `tail -f access.log` for real-time monitoring.
