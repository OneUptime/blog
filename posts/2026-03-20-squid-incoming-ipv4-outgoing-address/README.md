# How to Map Squid Incoming IPv4 Ports to Different Outgoing IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, IPv4, Proxy, Tcp_outgoing_address, ACL, Configuration, Networking

Description: Learn how to configure Squid to use different outgoing IPv4 source addresses based on which port or client the incoming request arrives on.

---

On Squid v7 and earlier, Squid's `tcp_outgoing_address` directive controls which IPv4 source address is used for outbound connections. By combining this with ACLs matching incoming ports or client addresses, you can route traffic from different clients through different public IPv4 addresses.

## Use Cases

- Multi-tenant proxy: different customers use different outbound IPs.
- Geographic routing: different sites exit through different public IPs.
- Rate limit bypass: spread traffic across multiple IPs to avoid per-IP rate limits.

## Prerequisites

Your server must have multiple routable IPv4 addresses assigned to its network interface. The `203.0.113.0/24` addresses below are documentation placeholders; replace them with IPv4 addresses assigned to your server.

```bash
# Assign additional IPv4 addresses to eth0

ip addr add 203.0.113.10/24 dev eth0
ip addr add 203.0.113.11/24 dev eth0

# Verify
ip -4 addr show eth0
```

## Squid Configuration

```squid
# /etc/squid/squid.conf

# --- Listening ports ---
# Port 3128: shared/default proxy port
http_port 3128

# Port 3129: dedicated port for Tenant A
http_port 3129

# Port 3130: dedicated port for Tenant B
http_port 3130

# Disable server-side connection reuse so ACL-based source-IP selection is applied correctly
server_persistent_connections off

# --- ACLs matching the local port Squid received the request on ---
acl port_tenant_a localport 3129
acl port_tenant_b localport 3130

# --- Map each port to a specific outgoing IPv4 source address ---
# Requests arriving on port 3129 exit through 203.0.113.10
tcp_outgoing_address 203.0.113.10 port_tenant_a

# Requests arriving on port 3130 exit through 203.0.113.11
tcp_outgoing_address 203.0.113.11 port_tenant_b

# Default: requests on port 3128 exit through the main IP
tcp_outgoing_address 203.0.113.1

# --- Access control: allow all (adjust for production) ---
http_access allow all
```

## Mapping by Client IPv4 Address Instead of Port

```squid
# ACL matching a specific client subnet
acl tenant_a_clients src 10.1.0.0/24
acl tenant_b_clients src 10.2.0.0/24

# Disable server-side connection reuse so ACL-based source-IP selection is applied correctly
server_persistent_connections off

# Outgoing IP based on which client subnet made the request
tcp_outgoing_address 203.0.113.10 tenant_a_clients
tcp_outgoing_address 203.0.113.11 tenant_b_clients
tcp_outgoing_address 203.0.113.1   # default fallback
```

## Reloading and Verifying

```bash
# Test configuration syntax
squid -k parse

# Reload Squid without dropping connections
squid -k reconfigure

# Check which IP is used for outbound connections (watch in packet capture)
tcpdump -i eth0 -nn host google.com

# Or use curl through a specific port
curl -x http://localhost:3129 http://ipinfo.io/ip
curl -x http://localhost:3130 http://ipinfo.io/ip
```

## Key Takeaways

- On Squid v7 and earlier, `tcp_outgoing_address <ip> <acl>` maps an outgoing IPv4 address to a specific ACL match.
- `localport` ACLs match on the port Squid received the connection on (useful for multi-port setups).
- `src` ACLs match on the client's IPv4 address for per-client outbound IP assignment.
- Disable `server_persistent_connections` when the outgoing address choice depends on client or request ACLs.
- Put the `tcp_outgoing_address` line without an ACL after the specific rules to make it the default for unmatched traffic.
