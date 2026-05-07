# How to Set IPv6 Address Preference in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Application Development, Address Selection, Python, Java, Node.js, Go

Description: Control IPv6 address preference within applications using socket API hints, language-specific settings, and getaddrinfo flags across Python, Java, Node.js, and Go.

## Application vs System Policy

System-level policy (`/etc/gai.conf`, `netsh`) affects all applications. But individual applications can override or fine-tune address selection:
- Specify address family (AF_INET6 vs AF_INET)
- Bind to a specific source address
- Request specific DNS record types
- Use Happy Eyeballs (RFC 8305) for automatic fallback

## Python: Address Family Control

```python
import socket

# Force IPv6 only

def connect_ipv6_only(host: str, port: int):
    # AF_INET6 explicitly - fails if no AAAA record
    try:
        results = socket.getaddrinfo(
            host, port,
            family=socket.AF_INET6,
            type=socket.SOCK_STREAM
        )
    except socket.gaierror as exc:
        raise ConnectionError("No IPv6 address available") from exc
    af, socktype, proto, canonname, sockaddr = results[0]
    sock = socket.socket(af, socktype, proto)
    sock.connect(sockaddr)
    return sock

# Force IPv4 only
def connect_ipv4_only(host: str, port: int):
    results = socket.getaddrinfo(
        host, port,
        family=socket.AF_INET,
        type=socket.SOCK_STREAM
    )
    af, socktype, proto, canonname, sockaddr = results[0]
    sock = socket.socket(af, socktype, proto)
    sock.connect(sockaddr)
    return sock

# Auto (system RFC 6724 policy)
def connect_auto(host: str, port: int):
    results = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    af, socktype, proto, canonname, sockaddr = results[0]  # system-sorted
    sock = socket.socket(af, socktype, proto)
    sock.connect(sockaddr)
    return sock
```

## Python: Bind to Specific Source

```python
import socket

def connect_with_source(dest_host: str, dest_port: int, src_addr: str):
    """Force a specific source IPv6 address."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

    # Bind to specific source address (bypasses RFC 6724 source selection)
    sock.bind((src_addr, 0, 0, 0))  # (addr, port, flowinfo, scope_id)

    # Resolve destination
    results = socket.getaddrinfo(
        dest_host, dest_port,
        family=socket.AF_INET6,
        type=socket.SOCK_STREAM
    )
    sock.connect(results[0][4])
    return sock

# Example: use ULA source for specific destination
sock = connect_with_source("2001:db8::1", 80, "fd00::10")
```

## Java: Controlling Address Selection

```java
import java.net.*;
import java.util.*;

public class AddressPreference {

    // Prefer IPv6 addresses in results
    public static InetAddress resolveIPv6(String host) throws UnknownHostException {
        InetAddress[] addresses = InetAddress.getAllByName(host);
        for (InetAddress addr : addresses) {
            if (addr instanceof Inet6Address) {
                return addr;
            }
        }
        throw new UnknownHostException("No IPv6 address for " + host);
    }

    // Prefer IPv4 addresses in results
    public static InetAddress resolveIPv4(String host) throws UnknownHostException {
        InetAddress[] addresses = InetAddress.getAllByName(host);
        for (InetAddress addr : addresses) {
            if (addr instanceof Inet4Address) {
                return addr;
            }
        }
        throw new UnknownHostException("No IPv4 address for " + host);
    }

    // Bind to specific source IPv6 address
    public static Socket connectWithSource(String destHost, int destPort,
                                           String srcAddr) throws Exception {
        InetAddress dest = resolveIPv6(destHost);
        InetAddress src = InetAddress.getByName(srcAddr);

        Socket socket = new Socket();
        // Bind source before connecting
        socket.bind(new InetSocketAddress(src, 0));
        socket.connect(new InetSocketAddress(dest, destPort));
        return socket;
    }
}
```

```bash
# JVM system properties for global preference
# Prefer IPv4 for ALL connections
java -Djava.net.preferIPv4Stack=true Application

# Prefer IPv6 addresses when both families are available
java -Djava.net.preferIPv6Addresses=true Application
```

## Node.js: Address Family Hints

```javascript
const dns = require('dns');
const net = require('net');

// Resolve with the system resolver, but only return IPv6
async function resolveIPv6(hostname) {
    return new Promise((resolve, reject) => {
        dns.lookup(hostname, { family: 6 }, (err, address) => {
            if (err) reject(err);
            else resolve(address);
        });
    });
}

// Connect with explicit IPv6 address
async function connectIPv6(hostname, port) {
    const addr = await resolveIPv6(hostname);
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({
            host: addr,
            port: port
        });
        socket.on('connect', () => resolve(socket));
        socket.on('error', reject);
    });
}

// HTTP request with IPv6 preference
const http = require('http');
http.get({
    hostname: 'example.com',
    port: 80,
    family: 6,  // Resolve hostname as IPv6 only
    path: '/'
}, (res) => {
    console.log('Status:', res.statusCode);
});
```

## Go: Dial with Address Family Control

```go
package main

import (
    "context"
    "fmt"
    "net"
)

func main() {
    // Connect using tcp6 (IPv6 only)
    dialer := &net.Dialer{}
    conn, err := dialer.DialContext(context.Background(), "tcp6", "example.com:80")
    if err != nil {
        fmt.Printf("IPv6 connection failed: %v\n", err)
        return
    }
    defer conn.Close()
    fmt.Printf("Connected from %s\n", conn.LocalAddr())

    // Bind to specific source address
    localAddr, err := net.ResolveTCPAddr("tcp6", "[2001:db8::10]:0")
    if err != nil {
        fmt.Printf("Resolve source address failed: %v\n", err)
        return
    }
    dialerWithSrc := &net.Dialer{LocalAddr: localAddr}
    conn2, err := dialerWithSrc.DialContext(context.Background(), "tcp6", "[2001:db8::1]:80")
    if err == nil {
        fmt.Printf("Source: %s\n", conn2.LocalAddr())
        conn2.Close()
    }
}
```

## Happy Eyeballs (RFC 8305) Implementation

```python
import asyncio

async def happy_eyeballs(host: str, port: int, delay: float = 0.25):
    """Use asyncio's Happy Eyeballs support for dual-stack fallback."""
    return await asyncio.open_connection(
        host,
        port,
        happy_eyeballs_delay=delay,
        interleave=1
    )
```

## Conclusion

Application-level address preference control gives fine-grained control beyond system policy. Specify `family=socket.AF_INET6` (or `AF_INET`) in `getaddrinfo()` calls to restrict the address family. Bind a socket to a specific source address to override RFC 6724 source selection. Java uses `java.net.preferIPv4Stack` and `preferIPv6Addresses` system properties for global control. Node.js accepts a `family` option in connection and HTTP client APIs to restrict hostname resolution to IPv4 or IPv6. Go's `net.Dialer` supports `LocalAddr` for source binding and `tcp6`/`tcp4` network strings for family restriction. For best dual-stack compatibility, use a Happy Eyeballs implementation such as asyncio's built-in `happy_eyeballs_delay`, which staggers IPv6 and IPv4 connection attempts with a short delay.
