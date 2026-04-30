# How to Use Flow Labels for Stateless Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Flow Label, Load Balancing, ECMP, Networking

Description: Use IPv6 Flow Labels to implement stateless per-flow load balancing across multiple uplinks or servers without maintaining per-connection state tables.

## Introduction

When endpoints set non-zero Flow Labels, IPv6 Flow Labels enable stateless load balancing by providing a per-flow identifier at Layer 3 without requiring the load balancer to inspect transport-layer ports. This is particularly valuable for traffic such as IPsec ESP or tunneled and fragmented packets where transport headers may be unavailable or inconvenient to parse. A load balancer can hash on (Source IP, Destination IP, Flow Label) and always send the same flow to the same backend while the backend set remains unchanged.

## Why Flow Labels Help Load Balancing

```text
Traditional load balancing: hash(src_ip, dst_ip, src_port, dst_port, protocol)
  → Must parse to Layer 4
  → Fails for IPsec ESP (no visible ports)
  → Difficult with tunneled traffic

Flow Label load balancing: hash(src_ip, dst_ip, flow_label)
  → Only Layer 3 parsing needed
  → Useful when transport headers are unavailable or inconvenient to parse
  → Non-zero labels are expected to remain unchanged along the path
  → Flow Label should be combined with source/destination addresses (RFC 6437)
```

## Linux ECMP with Flow Labels

```bash
# Check the current IPv6 ECMP hash policy
# 0 = Layer 3 hash using source, destination, and Flow Label

cat /proc/sys/net/ipv6/fib_multipath_hash_policy

# Enable automatic Flow Labels for locally generated IPv6 traffic
sudo sysctl -w net.ipv6.auto_flowlabels=1

# Explicitly use the Layer 3 ECMP hash policy
sudo sysctl -w net.ipv6.fib_multipath_hash_policy=0

# Add multiple equal-cost routes (ECMP)
sudo ip -6 route add 2001:db8:2::/48 \
    nexthop via 2001:db8:1::1 dev eth0 weight 1 \
    nexthop via 2001:db8:1::2 dev eth1 weight 1

# Verify ECMP routes
ip -6 route show 2001:db8:2::/48

# Under the Layer 3 policy, the kernel will distribute flows
# using source address, destination address, and Flow Label
```

## HAProxy Load Balancer with IPv6 Source-Address Persistence

Standard HAProxy configuration can provide IPv6 source-address persistence, but it does not natively hash on the IPv6 Flow Label.

```text
# haproxy.cfg - IPv6 frontend with source-address persistence
frontend ipv6_frontend
    bind [::]:443 ssl crt /etc/ssl/server.pem
    mode tcp
    default_backend ipv6_servers

backend ipv6_servers
    mode tcp
    balance source    # Hash on source address only
    server server1 [2001:db8:10::1]:8080 check
    server server2 [2001:db8:10::2]:8080 check
    server server3 [2001:db8:10::3]:8080 check
```

## NGINX Upstream with IPv6 Source-Address Hashing

NGINX `ip_hash` supports IPv6 client-address hashing, but it does not use the IPv6 Flow Label.

```nginx
# nginx.conf - IPv6 upstream load balancing
upstream backend_pool {
    ip_hash;   # Hash on client IP (persistent per client)

    server [2001:db8:20::1]:8080;
    server [2001:db8:20::2]:8080;
    server [2001:db8:20::3]:8080;
}

server {
    listen [::]:80;
    listen [::]:443 ssl;
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    location / {
        proxy_pass http://backend_pool;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Custom Flow Label Load Balancer (Python)

```python
import socket
import hashlib
import struct

class IPv6FlowLabelLoadBalancer:
    """
    Stateless load balancer using IPv6 Flow Label for backend selection.
    """

    def __init__(self, backends: list):
        """
        Args:
            backends: List of (ipv6_address, port) tuples
        """
        self.backends = backends

    def select_backend(self, src_addr: str, dst_addr: str, flow_label: int) -> tuple:
        """
        Select a backend server using flow label-based hashing.
        Same flow label always maps to the same backend (stateless).

        Args:
            src_addr:   Client's IPv6 address
            dst_addr:   Service's IPv6 address
            flow_label: IPv6 Flow Label from packet header

        Returns:
            (backend_address, backend_port) tuple
        """
        # Hash on (src, dst, flow_label) - same inputs → same output
        src_bytes = socket.inet_pton(socket.AF_INET6, src_addr)
        dst_bytes = socket.inet_pton(socket.AF_INET6, dst_addr)
        fl_bytes  = struct.pack("!I", flow_label & 0xFFFFF)

        hash_input = src_bytes + dst_bytes + fl_bytes
        hash_value = int(hashlib.sha256(hash_input).hexdigest(), 16)

        # Select backend using modulo
        backend_index = hash_value % len(self.backends)
        return self.backends[backend_index]

# Example usage
lb = IPv6FlowLabelLoadBalancer([
    ("2001:db8:30::1", 8080),
    ("2001:db8:30::2", 8080),
    ("2001:db8:30::3", 8080),
])

# Simulate requests from the same client flow
client = "2001:db8:100::1"
service = "2001:db8:200::1"
flow = 0x2A3B4

# Same flow always goes to same backend
for _ in range(5):
    backend = lb.select_backend(client, service, flow)
    print(f"Flow 0x{flow:05X} → {backend}")
# All 5 should print the same backend
```

## Handling Zero Flow Labels

When Flow Label = 0, fall back to 5-tuple hashing:

```python
def select_backend_with_fallback(
    lb, src_addr, dst_addr, flow_label,
    src_port=0, dst_port=0, protocol=6
):
    """Fall back to 5-tuple if flow label is zero."""
    if flow_label != 0:
        return lb.select_backend(src_addr, dst_addr, flow_label)

    src_bytes = socket.inet_pton(socket.AF_INET6, src_addr)
    dst_bytes = socket.inet_pton(socket.AF_INET6, dst_addr)
    l4_bytes = struct.pack("!HHB", src_port, dst_port, protocol)

    hash_input = src_bytes + dst_bytes + l4_bytes
    hash_value = int(hashlib.sha256(hash_input).hexdigest(), 16)
    return lb.backends[hash_value % len(lb.backends)]
```

## Conclusion

IPv6 Flow Labels enable stateless load balancing at Layer 3 without maintaining per-connection state tables. When non-zero labels are present, the same (src, dst, flow_label) triple always produces the same hash for a fixed backend set, ensuring all packets from a flow reach the same backend. This is especially valuable for traffic such as IPsec ESP or tunneled packets where transport ports are unavailable or not desirable to parse, and for high-performance environments where maintaining per-connection state is too expensive.
