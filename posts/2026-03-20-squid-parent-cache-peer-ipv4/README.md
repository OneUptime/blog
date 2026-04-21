# How to Set Up Squid with a Parent Cache Peer Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Cache Peer, IPv4, Proxy, Caching, Configuration, Networking

Description: Learn how to configure Squid to forward cache misses to a parent cache peer over IPv4, creating a hierarchical caching proxy setup.

---

A hierarchical Squid setup has a child proxy forward cache misses to a parent proxy. The parent has a larger cache and may be positioned closer to the internet. This reduces bandwidth usage at the edge and improves cache hit rates.

## Architecture

```mermaid
graph LR
    A[Client] --> B[Child Squid\n192.168.1.10:3128]
    B -->|Cache miss| C[Parent Squid\n10.0.0.1:3128]
    C -->|Cache miss| D[Internet]
    C -->|Cache hit| B
    B -->|Cached response| A
```

## Child Squid Configuration

```squid
# /etc/squid/squid.conf (on the child proxy)

# --- Parent cache peer definition ---

# cache_peer <hostname/IP> parent <http_port> <icp_port> [options]
# ICP port 0 disables ICP/HTCP queries; use the peer's ICP port,
# commonly 3130, only if ICP is enabled on the peer
cache_peer 10.0.0.1 parent 3128 0 no-query default

# --- Tell Squid to always forward to the parent (don't try direct) ---
never_direct allow all

# --- Or: prefer the parent but allow direct fallback if the parent is unavailable ---
# Use these instead of never_direct if you want fallback behavior.
# prefer_direct off
# nonhierarchical_direct off

# --- Listening port ---
http_port 3128

# --- Access control ---
acl localnet src 192.168.1.0/24
http_access allow localnet
http_access deny all
```

## Parent Squid Configuration

The parent needs no special configuration for hierarchy - it acts as a regular Squid proxy. Ensure it accepts connections from the child's IPv4 address.

```squid
# /etc/squid/squid.conf (on the parent proxy)
http_port 3128

# Allow the child proxy's IPv4 address to connect
acl child_proxy src 192.168.1.10/32
http_access allow child_proxy
http_access deny all
```

## Cache Peer Options

```squid
# Options for the cache_peer directive:
# no-query    - Don't use ICP to check if the parent has the object
# default     - Use this peer as the default if no other peer matches
# login=user:pass - Authenticate with the parent if it requires credentials
# proxy-only  - Don't cache objects fetched via this peer locally

cache_peer 10.0.0.1 parent 3128 0 no-query default proxy-only login=squid:secret
```

## Verifying the Hierarchy

```bash
# Check Squid configuration syntax
squid -k parse

# Reload Squid
squid -k reconfigure

# Test a request through the child proxy
curl -x http://192.168.1.10:3128 http://example.com

# Check cache manager for peer statistics
curl http://192.168.1.10:3128/squid-internal-mgr/server_list
```

## Confirming Parent Usage in Access Logs

```bash
# On the child: look for TCP_MISS with DEFAULT_PARENT in the access log
tail -f /var/log/squid/access.log | grep DEFAULT_PARENT
```

A log line containing `DEFAULT_PARENT/10.0.0.1` confirms the request was forwarded to the parent.

## Key Takeaways

- `cache_peer <ip> parent <port> 0 no-query default` defines the parent and disables ICP.
- `never_direct allow all` forces all traffic through the parent; remove it to allow direct connections for performance.
- Use `proxy-only` to prevent the child from caching locally, relying entirely on the parent cache.
- Monitor parent usage in the child's access log by grepping for `DEFAULT_PARENT`.
