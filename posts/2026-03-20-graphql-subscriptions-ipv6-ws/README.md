# How to Configure GraphQL Subscriptions over IPv6 WebSocket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, WebSocket, Subscription, IPv6, Real-Time

Description: Set up GraphQL subscriptions using WebSocket transport over IPv6 for real-time data delivery.

## Overview

Set up GraphQL subscriptions using WebSocket transport over IPv6 for real-time data delivery. This guide covers the configuration steps and best practices.

## Prerequisites

- Basic understanding of IPv6 networking
- The relevant software installed and running
- IPv6 connectivity on your server

## Configuration

Each framework has specific ways to bind to IPv6 interfaces. The general pattern is to use `::` as the bind address, which is the IPv6 unspecified address. Depending on the server and OS, binding to `::` may also accept IPv4 connections unless IPv6-only mode is enabled.

```bash
# Verify IPv6 is available on your system

ip -6 addr show
ping -6 -c 3 ::1
```

## Step-by-Step Setup

### 1. Bind to IPv6 Interfaces

Most servers accept `::` as the host to listen on all IPv6 interfaces:

```javascript
// Node.js example
server.listen(4000, '::', () => {
    console.log('Server listening on [::]:4000');
});
```

```python
# Python example
uvicorn.run(app, host="::", port=4000)
```

### 2. Handle IPv6 Addresses in Application Logic

When working with client addresses, normalize IPv4-mapped IPv6 addresses:

```javascript
function getClientIP(req) {
    const addr = req.socket.remoteAddress || '';
    // Convert ::ffff:192.168.1.1 to 192.168.1.1
    const ipv4Mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return ipv4Mapped ? ipv4Mapped[1] : addr;
}
```

### 3. Firewall Configuration

Ensure your firewall allows incoming connections on the required port over IPv6:

```bash
# UFW (when IPv6 is enabled in UFW)
sudo ufw allow 4000/tcp

# ip6tables
sudo ip6tables -A INPUT -p tcp --dport 4000 -j ACCEPT
```

### 4. DNS Configuration

Add an AAAA record pointing to your server's IPv6 address:

```text
example.com.  300  IN  AAAA  2001:db8::1
```

## Testing

```bash
# Test the GraphQL HTTP endpoint over IPv6
curl -6 http://[2001:db8::1]:4000/graphql   -H "Content-Type: application/json"   -d '{"query": "{ __typename }"}'

# Verify IPv6 is used
curl -6 -v http://[::1]:4000/ 2>&1 | grep "Connected"
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your service's IPv6 endpoints. Set up HTTP monitors pointing to your IPv6 address and configure alerts for availability and response time thresholds.

## Conclusion

Configuring How to Configure GraphQL Subscriptions over IPv6 WebSocket is primarily about ensuring the server binds to IPv6 interfaces using `::` and that firewalls permit traffic on the required ports. Client IPv6 addresses are then available through standard request handling mechanisms in your application code.
