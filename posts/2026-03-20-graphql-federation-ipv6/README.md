# How to Handle IPv6 in GraphQL Federation Gateways

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, Apollo Federation, IPv6, Microservice, Gateway

Description: Configure Apollo Federation gateway and subgraph services to communicate over IPv6 in microservices architectures.

## Overview

Configure Apollo Federation gateway and subgraph services to communicate over IPv6 in microservices architectures. This guide covers the configuration steps and best practices.

## Prerequisites

- Basic understanding of IPv6 networking
- The relevant software installed and running
- IPv6 connectivity on your server

## Configuration

Each framework has specific ways to bind to IPv6 interfaces. The general pattern is to use `::` as the bind address, which is the IPv6 equivalent of `0.0.0.0`. When you use literal IPv6 addresses in gateway or service URLs, enclose them in square brackets.

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

For Apollo Gateway, use bracketed IPv6 literals in subgraph URLs, or use hostnames that resolve to AAAA records:

```javascript
const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
        subgraphs: [
            { name: 'users', url: 'http://[2001:db8::10]:4001/graphql' },
            { name: 'orders', url: 'http://[2001:db8::11]:4002/graphql' },
        ],
    }),
});
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
# UFW
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
# Test over IPv6
curl -6 http://[2001:db8::1]:4000/graphql   -H "Content-Type: application/json"   -d '{"query": "{ __typename }"}'

# Verify IPv6 is used
curl -6 -v http://[::1]:4000/ 2>&1 | grep "Connected"
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your service's IPv6 endpoints. Set up HTTP monitors pointing to your IPv6 address and configure alerts for availability and response time thresholds.

## Conclusion

Configuring How to Handle IPv6 in GraphQL Federation Gateways is primarily about ensuring the server binds to IPv6 interfaces using `::`, that gateway subgraph URLs use bracketed IPv6 literals when configured directly, and that firewalls permit traffic on the required ports. Client IPv6 addresses are then available through standard request handling mechanisms in your application code.
