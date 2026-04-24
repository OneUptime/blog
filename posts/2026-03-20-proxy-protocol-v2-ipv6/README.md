# How to Configure PROXY Protocol v2 for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Proxy Protocol, HAProxy, Nginx, Load Balancer, Client IP

Description: Configure PROXY Protocol v2 to carry IPv6 client addresses through load balancers and reverse proxies, enabling backends to see the original client IPv6 address.

## Introduction

PROXY Protocol is a network protocol that prepends a header to TCP connections carrying the original client IP address and port. Version 2 uses a binary format and supports IPv6 addresses (16 bytes) natively. It is used by HAProxy, Nginx, AWS Network Load Balancer, and other load balancers to pass the real client IP to backends without relying on HTTP headers.

## How PROXY Protocol v2 Works

```text
Client (2001:db8::1:1234) → Load Balancer → Backend (with PROXY Protocol header)

Binary header at start of TCP stream:
  Signature: \x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A
  Version/Command: 0x21 (v2, PROXY)
  Family/Protocol: 0x21 (AF_INET6, STREAM)
  Length: 0x0024 (36 bytes for IPv6+ports)
  Source Address: 2001:db8::1 (16 bytes)
  Destination Address: 2001:db8::2 (16 bytes)
  Source Port: 1234 (2 bytes)
  Destination Port: 443 (2 bytes)
```

## HAProxy: Send PROXY Protocol v2

```haproxy
# /etc/haproxy/haproxy.cfg

frontend web_ipv6
    bind [::]:443 ssl crt /etc/ssl/certs/app.pem
    bind 0.0.0.0:443 ssl crt /etc/ssl/certs/app.pem

    default_backend app_servers

backend app_servers
    # Send PROXY Protocol v2 header to backends
    server app1 10.0.0.1:8080 send-proxy-v2
    server app2 10.0.0.2:8080 send-proxy-v2
    server app3 [2001:db8::10]:8080 send-proxy-v2
```

## Nginx: Accept PROXY Protocol v2

```nginx
# /etc/nginx/conf.d/proxy-protocol.conf

# This file is included from the http {} block in nginx.conf

# Include client IPv6 in access log
log_format proxy_proto '$proxy_protocol_addr - $remote_user [$time_local] '
                       '"$request" $status $body_bytes_sent';

server {
    # Accept PROXY Protocol headers on this port
    listen 8080 proxy_protocol;
    listen [::]:8080 proxy_protocol;

    # Real client IP is now available from the PROXY protocol header
    # $proxy_protocol_addr contains the IPv6 address from the header
    set_real_ip_from 10.0.0.0/8;
    set_real_ip_from fd00::/8;
    real_ip_header proxy_protocol;

    location / {
        proxy_pass http://backend:9090;

        # Pass the original client IPv6 address downstream
        proxy_set_header X-Forwarded-For $proxy_protocol_addr;
        proxy_set_header X-Real-IP       $proxy_protocol_addr;
    }

    access_log /var/log/nginx/access.log proxy_proto;
}
```

## HAProxy: Receive PROXY Protocol v2 and Log IPv6 Client

```haproxy
frontend internal
    # Accept PROXY Protocol from the upstream load balancer
    bind [::]:8080 accept-proxy

    # %ci logs the client IP from the PROXY Protocol header when accept-proxy is set
    log-format "%ci:%cp [%t] %ft %b/%s %Tw/%Tc/%Tt %B %ts"

    default_backend app
```

## Application: Parse PROXY Protocol v2 in Python

```python
#!/usr/bin/env python3
# proxy_protocol_v2_parser.py

import socket
import struct
import ipaddress

PROXY_V2_SIGNATURE = b'\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A'
PROXY_V2_HEADER_LEN = 16

def parse_proxy_v2_header(data: bytes) -> dict:
    """Parse PROXY Protocol v2 binary header from TCP stream."""
    if len(data) < PROXY_V2_HEADER_LEN:
        raise ValueError("Header too short")

    if data[:12] != PROXY_V2_SIGNATURE:
        raise ValueError("Not a PROXY Protocol v2 header")

    ver_cmd = data[12]
    fam_proto = data[13]
    length = struct.unpack('!H', data[14:16])[0]
    if len(data) < PROXY_V2_HEADER_LEN + length:
        raise ValueError("Incomplete PROXY Protocol v2 header")

    version = (ver_cmd >> 4) & 0x0F
    command = ver_cmd & 0x0F

    address_family = (fam_proto >> 4) & 0x0F
    protocol = fam_proto & 0x0F

    if version != 2:
        raise ValueError(f"Unsupported PROXY Protocol version: {version}")

    # PROXY command = 1, AF_INET6 = 2, STREAM = 1
    if command == 1 and address_family == 2 and protocol == 1 and length >= 36:
        payload = data[16:16 + length]
        src_addr = ipaddress.ip_address(payload[0:16])
        dst_addr = ipaddress.ip_address(payload[16:32])
        src_port = struct.unpack('!H', payload[32:34])[0]
        dst_port = struct.unpack('!H', payload[34:36])[0]
        return {
            "version": version,
            "address_family": "IPv6",
            "src_addr": str(src_addr),
            "dst_addr": str(dst_addr),
            "src_port": src_port,
            "dst_port": dst_port,
            "header_length": PROXY_V2_HEADER_LEN + length,
        }

    raise ValueError(f"Unsupported address family: {address_family}")

def handle_connection(conn: socket.socket) -> None:
    """Handle an incoming connection with PROXY Protocol v2."""
    # Read the first chunk, then pull the rest of the header if the signature matches.
    data = conn.recv(1024)

    try:
        if len(data) >= PROXY_V2_HEADER_LEN and data[:12] == PROXY_V2_SIGNATURE:
            length = struct.unpack('!H', data[14:16])[0]
            required = PROXY_V2_HEADER_LEN + length
            while len(data) < required:
                chunk = conn.recv(required - len(data))
                if not chunk:
                    break
                data += chunk

        info = parse_proxy_v2_header(data)
        client_ipv6 = info["src_addr"]
        client_port = info["src_port"]
        print(f"Real client: [{client_ipv6}]:{client_port}")

        # Process the rest of the data after the PROXY Protocol header
        payload = data[info["header_length"]:]
        # ... handle payload
    except ValueError as e:
        print(f"No PROXY Protocol header: {e}")
        payload = data
        # ... handle payload without real IP
```

## Testing PROXY Protocol v2

```bash
# Test by sending a PROXY Protocol v2 header to a local port

# curl's --haproxy-protocol option sends a PROXY protocol v1 header, not v2.
# To test v2 specifically, send a binary header directly:
python3 - <<'PY'
import ipaddress
import socket
import struct

sig = b'\r\n\r\n\x00\r\nQUIT\n'
src = ipaddress.IPv6Address("2001:db8::1").packed
dst = ipaddress.IPv6Address("::1").packed
ports = struct.pack("!HH", 1234, 8080)
addr_block = src + dst + ports
header = sig + b'\x21' + b'\x21' + struct.pack("!H", len(addr_block)) + addr_block

with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as sock:
    sock.connect(("::1", 8080))
    sock.sendall(header + b"GET / HTTP/1.1\r\nHost: [::1]\r\nConnection: close\r\n\r\n")
    print(sock.recv(4096).decode(errors="replace"))
PY
```

## Common Pitfalls

| Issue | Cause | Fix |
|-------|-------|-----|
| Connection refused or HTTP 400 after enabling | Backend doesn't accept PROXY Protocol | Enable `proxy_protocol` in Nginx, `accept-proxy` in HAProxy, or add application-side parsing |
| `$proxy_protocol_addr` is empty | `proxy_protocol` is not enabled on the listener, or no valid PROXY header arrived | Enable `proxy_protocol` on the listener and verify the upstream sends PROXY Protocol |
| Nginx logs show the load balancer IP | Logging `$remote_addr` without RealIP or PROXY variables | Use `$proxy_protocol_addr` or set `real_ip_header proxy_protocol` |
| Binary garbage in HTTP logs | PROXY v2 header not parsed by the listener | Enable `proxy_protocol` in Nginx or `accept-proxy` in HAProxy |

## Conclusion

PROXY Protocol v2 provides a reliable, binary-format mechanism for carrying IPv6 client addresses through load balancers without depending on HTTP headers. HAProxy sends v2 headers with `send-proxy-v2` and accepts them with `accept-proxy`. Nginx accepts them with the `proxy_protocol` listen parameter and exposes the client address via `$proxy_protocol_addr`. This approach works for any TCP-based protocol, not just HTTP, making it valuable for databases, SMTP relays, and other services where HTTP headers are unavailable.
