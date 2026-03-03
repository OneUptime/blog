# How to Use socat for Network Data Transfer on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Security, Tools, System Administration

Description: A practical guide to using socat on Ubuntu for bidirectional data relay between sockets, files, and network connections with real-world examples.

---

`socat` (SOcket CAT) is a command-line utility that establishes two bidirectional byte streams and transfers data between them. Where `nc` (netcat) is a simple single-connection tool, socat is more powerful: it supports a wider range of address types, SSL/TLS, connection logging, forking to handle multiple clients, and complex addressing options.

Understanding socat's address syntax unlocks its power. Every socat command has the form: `socat ADDRESS1 ADDRESS2`, where the two addresses can be any combination of TCP sockets, UDP sockets, files, pipes, serial ports, PTYs, and more.

## Installation

```bash
sudo apt install socat
socat -V  # verify installation and show version
```

## Basic Syntax

```text
socat [options] <address1> <address2>
```

Common address types:
- `TCP:host:port` - TCP connection (client)
- `TCP-LISTEN:port` - TCP server (listen)
- `UDP:host:port` - UDP
- `STDIN` / `STDOUT` - Standard I/O
- `FILE:filename` - File
- `PIPE:command` - Execute command
- `UNIX-LISTEN:path` - Unix domain socket
- `SSL:host:port` - SSL/TLS connection
- `PTY` - Pseudo-terminal

## Simple Examples

### TCP Client and Server

```bash
# Start a listener on port 8080
socat TCP-LISTEN:8080,reuseaddr -

# In another terminal, connect to it
socat - TCP:localhost:8080
# Type in either terminal and it appears in the other
```

### Echo Server

```bash
# Simple echo server on port 9000
socat TCP-LISTEN:9000,reuseaddr,fork EXEC:cat

# Test it
echo "hello world" | socat - TCP:localhost:9000
```

### Send a File Over Network

```bash
# Receiver (waits for connection)
socat TCP-LISTEN:5000,reuseaddr > received_file.tar.gz

# Sender
socat - TCP:receiver-host:5000 < file.tar.gz

# With progress (pipe through pv)
sudo apt install pv
pv large_file.tar.gz | socat - TCP:receiver-host:5000
```

## Port Forwarding and Proxying

This is one of the most common practical uses of socat.

### Forward Local Port to Remote

```bash
# Forward local port 8080 to remote host:port
# Any connection to localhost:8080 gets forwarded to example.com:80
socat TCP-LISTEN:8080,reuseaddr,fork TCP:example.com:80

# Fork is required to handle multiple clients simultaneously
```

### Forward to a Unix Socket

```bash
# Forward a TCP port to a Unix domain socket
# Useful for accessing Docker daemon remotely
socat TCP-LISTEN:2375,reuseaddr,fork UNIX-CONNECT:/var/run/docker.sock

# Now you can use Docker remotely
# DOCKER_HOST=tcp://server-ip:2375 docker ps
```

### Expose a Unix Socket as TCP

```bash
# PostgreSQL typically uses a Unix socket
# Expose it on TCP for a remote client
socat TCP-LISTEN:5432,reuseaddr,fork UNIX-CONNECT:/var/run/postgresql/.s.PGSQL.5432
```

### Bidirectional Port Mapping

```bash
# Map UDP port to TCP (for protocols that can use either)
socat UDP-LISTEN:1234,fork TCP:target-host:1234
```

## SSL/TLS with socat

### Create SSL Certificates for Testing

```bash
# Generate a self-signed certificate
openssl req -newkey rsa:2048 -nodes -keyout server.key \
    -x509 -days 365 -out server.crt \
    -subj "/CN=localhost"

# Combine into PEM file
cat server.key server.crt > server.pem
```

### SSL Server

```bash
# Start an SSL-wrapped server
socat \
    OPENSSL-LISTEN:8443,cert=server.pem,cafile=server.crt,reuseaddr,fork \
    EXEC:cat
```

### SSL Client

```bash
# Connect to SSL server
socat \
    STDIO \
    OPENSSL:localhost:8443,cafile=server.crt

# Connect to an SSL server and forward to a local port
socat \
    TCP-LISTEN:8080,reuseaddr,fork \
    OPENSSL:backend.example.com:443,cafile=/etc/ssl/certs/ca-certificates.crt
```

### SSL Tunnel (bypass corporate proxy restrictions)

```bash
# On the server (accessible from outside):
socat OPENSSL-LISTEN:443,cert=server.pem,fork TCP:localhost:22

# On the client:
socat TCP-LISTEN:2222,reuseaddr OPENSSL:server.example.com:443,cafile=server.crt

# Then SSH to localhost:2222 to reach the server
ssh -p 2222 user@localhost
```

## Working with Files and Pipes

```bash
# Read from a file and send to network
socat FILE:/var/log/syslog TCP:log-collector:514

# Write network data to a file
socat TCP-LISTEN:9999,reuseaddr FILE:/tmp/captured.txt,create

# Pipe through a command
# Compress data in transit
socat TCP-LISTEN:9999,fork EXEC:"gzip -d"   # decompress on receive

# On sender
tar czf - /important/data | socat - TCP:server:9999
```

## Pseudo-Terminal (PTY) Uses

socat can create PTYs, which is useful for connecting programs that expect a terminal.

```bash
# Create a virtual serial port pair
socat PTY,link=/dev/ttyS10,raw,echo=0 PTY,link=/dev/ttyS11,raw,echo=0

# Now /dev/ttyS10 and /dev/ttyS11 are connected to each other
# Write to one, read from the other

# Expose a serial device over network
socat TCP-LISTEN:7777,reuseaddr,fork /dev/ttyUSB0,raw,b115200

# Connect to it from another machine
socat - TCP:server:7777
```

## Debugging and Testing

### HTTP Testing

```bash
# Make a raw HTTP request and see the full response
socat - TCP:example.com:80 <<EOF
GET / HTTP/1.1
Host: example.com
Connection: close

EOF
```

### HTTPS Testing

```bash
# Raw HTTPS request
echo -e "GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n" | \
    socat - OPENSSL:example.com:443
```

### Network Relay with Logging

```bash
# Relay traffic and log everything to a file
socat -v TCP-LISTEN:8080,reuseaddr,fork TCP:backend:8080 2>/tmp/relay.log

# -v logs data in both directions with timestamps
# Useful for debugging protocol issues

# Log in hex
socat -x TCP-LISTEN:8080,reuseaddr,fork TCP:backend:8080 2>/tmp/relay-hex.log
```

### Test if a Port is Open

```bash
# More reliable than nc for some cases
socat /dev/null TCP:host:port
echo $?  # 0 = success, non-zero = failed

# With timeout
socat /dev/null TCP:host:port,connect-timeout=5
```

## Multicast

```bash
# Join a multicast group and receive data
socat UDP4-RECVFROM:5000,ip-add-membership=224.0.0.251:eth0 STDOUT

# Send to a multicast group
echo "hello multicast" | socat STDIN UDP4-DATAGRAM:224.0.0.251:5000
```

## Running as a Service

For persistent port forwarding, run socat as a systemd service:

```bash
sudo nano /etc/systemd/system/socat-forward.service
```

```ini
[Unit]
Description=socat TCP port forwarder
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/socat TCP-LISTEN:8080,reuseaddr,fork TCP:backend.internal:80
Restart=always
RestartSec=5
User=nobody

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now socat-forward
sudo systemctl status socat-forward
```

## Useful Address Options

Options modify how an address behaves. They're appended after the address with commas:

```text
TCP-LISTEN:8080,reuseaddr,fork,bind=127.0.0.1
```

| Option | Effect |
|--------|--------|
| `reuseaddr` | Reuse address after restart (avoids "address in use" errors) |
| `fork` | Fork a child for each connection (server mode) |
| `bind=IP` | Bind to a specific IP address |
| `connect-timeout=N` | Connection timeout in seconds |
| `retry=N` | Retry connection N times |
| `forever` | Retry indefinitely |
| `keepalive` | Enable TCP keepalive |
| `nodelay` | Disable Nagle's algorithm (lower latency) |
| `crnl` | Convert CR-LF to NL |

socat is a remarkably versatile tool. Anywhere you need to move data between two endpoints - whether those endpoints are TCP sockets, Unix sockets, files, serial ports, or SSL connections - socat can bridge them with minimal setup. Combined with the `fork` option for multi-client server scenarios and the logging options for debugging, it covers a wide range of network plumbing tasks that would otherwise require writing custom code.
