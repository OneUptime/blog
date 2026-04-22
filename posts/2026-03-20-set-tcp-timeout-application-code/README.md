# How to Set TCP Connection Timeout Values in Application Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Programming, Python, Go, Java, Timeout, Networking

Description: Configure TCP connection, read, and write timeout values in popular programming languages to prevent hung connections from blocking application threads.

## Introduction

Application-level TCP timeouts are essential for building resilient services. Without explicit timeouts, a single unresponsive server can tie up a thread indefinitely. Setting connection timeout (how long to wait for the handshake), read timeout (how long to wait for data), and write timeout (how long to wait to send data) prevents resource exhaustion from stuck connections.

## Python

```python
import socket
import requests
import httpx

# Standard socket timeouts

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(5.0)  # 5 second timeout for all operations

try:
    s.connect(('10.20.0.5', 8080))  # Will raise socket.timeout after 5s
    s.sendall(b'GET / HTTP/1.0\r\n\r\n')
    data = s.recv(4096)  # Will raise socket.timeout if no data after 5s
finally:
    s.close()

# Separate connect vs read timeout with requests
response = requests.get(
    'http://10.20.0.5:8080',
    timeout=(3.05, 27)  # (connect_timeout, read_timeout) in seconds
)

# httpx with comprehensive timeout control
client = httpx.Client(timeout=httpx.Timeout(
    connect=3.0,    # TCP handshake timeout
    read=30.0,      # Time to read response
    write=10.0,     # Time to send request
    pool=5.0        # Time to get connection from pool
))
```

## Go

```go
package main

import (
    "net"
    "net/http"
    "time"
)

func main() {
    // Custom dialer with connect timeout
    dialer := &net.Dialer{
        Timeout:   3 * time.Second,   // Connection establishment timeout
        KeepAlive: 30 * time.Second,  // Keepalive interval
    }

    // HTTP client with all timeout types
    client := &http.Client{
        Timeout: 30 * time.Second,  // Overall request timeout, including redirects and response body reads
        Transport: &http.Transport{
            DialContext:           dialer.DialContext,
            TLSHandshakeTimeout:   5 * time.Second,
            ResponseHeaderTimeout: 10 * time.Second, // Time to receive response headers
            IdleConnTimeout:       90 * time.Second, // How long idle keep-alive connections stay open
        },
    }

    resp, err := client.Get("http://10.20.0.5:8080")
    if err != nil {
        // err may report a timeout, such as context deadline exceeded or i/o timeout
        return
    }
    defer resp.Body.Close()
}
```

## Java

```java
import java.net.*;
import java.io.*;

public class TCPTimeoutExample {
    public static void main(String[] args) throws Exception {
        Socket socket = new Socket();

        // Set connection timeout (SYN to SYN-ACK)
        int connectTimeoutMs = 3000;  // 3 seconds

        // Set read timeout (time to receive data after connection)
        int readTimeoutMs = 30000;  // 30 seconds

        try {
            socket.connect(
                new InetSocketAddress("10.20.0.5", 8080),
                connectTimeoutMs
            );
            socket.setSoTimeout(readTimeoutMs);  // Read timeout

            // Use the connection...
            InputStream in = socket.getInputStream();
            in.read();  // If no data arrives within 30s: SocketTimeoutException

        } catch (SocketTimeoutException e) {
            System.err.println("Timeout: " + e.getMessage());
        } finally {
            socket.close();
        }
    }
}
```

## Node.js

```javascript
const net = require('net');

// Create socket with timeout
const socket = net.createConnection({
    host: '10.20.0.5',
    port: 8080,
    timeout: 5000  // 5 second timeout for inactivity
});

socket.on('connect', () => {
    console.log('Connected');
    socket.setTimeout(30000);  // After connect, set 30s data timeout
});

socket.on('timeout', () => {
    console.error('Connection timed out');
    socket.destroy();  // Must manually destroy on timeout
});

socket.on('error', (err) => {
    console.error('Error:', err.message);
});
```

## Timeout Best Practices

```text
Connect timeout: 1-5 seconds
  - Should fit within your overall request deadline and retry budget
  - Fail fast so you can try another server

Read timeout: 30-60 seconds for APIs, 300s+ for long-running queries
  - Set based on expected response time + buffer for slow moments
  - Never set to infinity (no timeout)

Write timeout: 10-30 seconds
  - Time to make progress sending request body data
  - Important for large file uploads

Overall request deadline: connect + TLS + write + read
  - Set an overall deadline that covers all phases
```

## Conclusion

Application-level timeouts prevent resource exhaustion from unresponsive upstream services. Always set separate connect and read timeouts - connect timeouts catch servers that are down, while read timeouts catch servers that connect but never respond. Use the smallest timeout that allows legitimate operations to complete reliably.
