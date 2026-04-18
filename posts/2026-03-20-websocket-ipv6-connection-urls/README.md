# How to Handle IPv6 in WebSocket Connection URLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebSocket, IPv6, URL, JavaScript, Browser

Description: Correctly format WebSocket connection URLs with IPv6 addresses in browsers, Node.js clients, and reverse proxy configurations.

## IPv6 URL Format for WebSockets

IPv6 addresses in URLs must be enclosed in square brackets per RFC 3986:

```text
ws://[ipv6-address]:port/path
wss://[ipv6-address]:port/path
```

Examples:
```text
ws://[::1]:8080/              # Loopback
ws://[2001:db8::1]:8080/     # Specific IPv6 address
wss://[2001:db8::1]:8443/ws  # Secure WebSocket with path
```

## Browser JavaScript WebSocket Client

```javascript
// browser-client.js

// Connect to IPv6 WebSocket server
// Browsers natively support IPv6 in WebSocket URLs
const socket = new WebSocket('ws://[2001:db8::1]:8080/');

socket.addEventListener('open', (event) => {
    console.log('Connected to IPv6 WebSocket server');
    socket.send('Hello from IPv6 browser client!');
});

socket.addEventListener('message', (event) => {
    console.log('Received:', event.data);
});

socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
});

socket.addEventListener('close', (event) => {
    console.log('Disconnected:', event.code, event.reason);
});
```

## Dynamic URL Construction for Dual-Stack

```javascript
// url-helper.js - construct WebSocket URLs for IPv4 or IPv6

function buildWebSocketURL({ host, port, path = '/', secure = false, preferIPv6 = true }) {
    const scheme = secure ? 'wss' : 'ws';

    // Detect IPv6 address (contains colon, not already bracketed)
    const isIPv6 = host.includes(':') && !host.startsWith('[');

    // Wrap IPv6 in brackets
    const formattedHost = isIPv6 ? `[${host}]` : host;

    return `${scheme}://${formattedHost}:${port}${path}`;
}

// Usage examples:
buildWebSocketURL({ host: '2001:db8::1', port: 8080 });
// → 'ws://[2001:db8::1]:8080/'

buildWebSocketURL({ host: '192.168.1.1', port: 8080, secure: true });
// → 'wss://192.168.1.1:8080/'

buildWebSocketURL({ host: '::1', port: 8080, path: '/realtime' });
// → 'ws://[::1]:8080/realtime'
```

## Auto-Detect Server Protocol and IPv6

```javascript
// Connect to the same server the page was loaded from
// This automatically handles IPv6 if the page was loaded via IPv6

function connectToServer(path = '/ws') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // Already includes brackets for IPv6
    // window.location.host = "[2001:db8::1]:443" for IPv6

    const wsUrl = `${protocol}//${host}${path}`;
    console.log(`Connecting to: ${wsUrl}`);

    return new WebSocket(wsUrl);
}

// If page is served from http://[2001:db8::1]:8080/
// wsUrl = ws://[2001:db8::1]:8080/ws
```

## Node.js WebSocket Client with IPv6

```javascript
// node-client.js
const WebSocket = require('ws');

// Node.js ws library handles IPv6 in brackets
const ws = new WebSocket('ws://[2001:db8::1]:8080/');

ws.on('open', () => {
    console.log('Connected');
    ws.send('Hello from Node.js over IPv6!');
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
});
```

## Nginx Proxy for WebSocket with IPv6

When using Nginx as a WebSocket proxy, clients connect to Nginx via IPv6:

```nginx
# nginx.conf

server {
    listen [::]:80;
    server_name example.com;

    location /ws {
        proxy_pass http://[2001:db8:bac::1]:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

Client connects via: `ws://[2001:db8::1]/ws`

## Monitoring WebSocket URLs

```bash
# Verify WebSocket connectivity to IPv6 address
wscat -c ws://[2001:db8::1]:8080/

# Test upgrade headers manually
curl -6 -i \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: test==" \
  -H "Sec-WebSocket-Version: 13" \
  http://[2001:db8::1]:8080/
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor WebSocket endpoint availability over IPv6. Configure TCP monitors on your WebSocket port at your IPv6 address and set up alerts for connection failures.

## Conclusion

WebSocket URLs with IPv6 addresses require square brackets around the address: `ws://[2001:db8::1]:8080/`. When building dynamic WebSocket URLs, check if the host contains a colon and wrap it in brackets. Browsers handle IPv6 WebSocket URLs natively, and Node.js ws library works identically with IPv6 URLs.
