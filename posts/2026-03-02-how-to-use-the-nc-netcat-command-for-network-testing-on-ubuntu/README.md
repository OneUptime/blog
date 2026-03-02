# How to Use the nc (Netcat) Command for Network Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Linux, Security, Command Line

Description: Learn to use netcat (nc) on Ubuntu for port scanning, connection testing, file transfers, banner grabbing, and setting up simple network listeners.

---

Netcat - invoked as `nc` - is often called the "Swiss Army knife" of networking tools. It can open TCP or UDP connections, listen on ports, transfer files, scan ports, and send raw data across a network. It is installed on nearly every Linux system and requires no special permissions for most operations.

## Installing Netcat on Ubuntu

Ubuntu typically includes `netcat-openbsd` by default. Verify or install it:

```bash
# Check what is installed
which nc
nc -h 2>&1 | head -5

# Install if missing
sudo apt update
sudo apt install netcat-openbsd

# Alternative: traditional netcat (different flags/behavior)
sudo apt install netcat-traditional
```

The OpenBSD variant is preferred on modern Ubuntu systems. Some flag behavior differs between the two; this post uses `netcat-openbsd` syntax.

## Testing Port Connectivity

The most common use: check if a port is open on a remote host.

```bash
# Test if port 80 is open on a host
nc -zv 192.168.1.10 80

# -z = scan mode (don't send data)
# -v = verbose (show result)

# Test a range of ports
nc -zv 192.168.1.10 20-25

# Test UDP port (DNS on port 53)
nc -zvu 8.8.8.8 53

# Set a timeout (don't wait forever for unroutable hosts)
nc -zvw3 192.168.1.10 443
# -w 3 = timeout after 3 seconds
```

Exit codes: 0 means connected successfully, non-zero means connection refused or timed out. This makes `nc` useful in scripts:

```bash
#!/bin/bash
# Check if database port is reachable before starting app
if nc -zw3 db.internal 5432; then
    echo "Database is reachable"
    start_application
else
    echo "Cannot reach database on port 5432"
    exit 1
fi
```

## Grabbing Service Banners

Many services announce themselves when you connect. Netcat lets you see those banners:

```bash
# Grab SSH banner
nc 192.168.1.10 22

# Grab HTTP server header
printf "HEAD / HTTP/1.0\r\n\r\n" | nc example.com 80

# Grab SMTP banner
nc mail.example.com 25

# Quick banner with timeout
echo "" | nc -w2 192.168.1.10 21
```

This is useful for identifying service versions during audits or troubleshooting.

## Setting Up a Simple Listener

Netcat can listen on a port and print whatever is sent to it. This is invaluable for debugging network applications.

```bash
# Listen on port 9000, print received data
nc -l 9000

# Keep listening after each connection (loop mode)
nc -lk 9000

# Listen and save received data to a file
nc -l 9000 > received_data.txt
```

From another terminal or machine, send data:

```bash
# Send a message to the listener
echo "Hello from client" | nc 127.0.0.1 9000

# Send a file
nc 127.0.0.1 9000 < myfile.txt
```

## Transferring Files Between Machines

Netcat provides a quick way to transfer files without SCP, FTP, or HTTP - useful when those tools are unavailable.

```bash
# On the receiving machine - listen and save output
nc -l 5555 > backup.tar.gz

# On the sending machine - send the file
nc -w3 192.168.1.20 5555 < backup.tar.gz
```

For larger transfers, combine with compression:

```bash
# Sender: compress and send
tar czf - /home/user/data/ | nc 192.168.1.20 5555

# Receiver: accept and decompress
nc -l 5555 | tar xzf -
```

Note: this transfer is unencrypted. Use it only on trusted networks or when speed matters more than security.

## Creating a Simple Chat

Two people on the same network can chat using netcat:

```bash
# Person 1 listens
nc -l 6000

# Person 2 connects
nc 192.168.1.5 6000
```

Both terminals can now type messages that appear on the other screen. Press Ctrl+D to end the session.

## HTTP Request Testing

Netcat lets you send raw HTTP requests and see raw responses:

```bash
# Send a GET request
printf "GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n" | nc example.com 80

# Check if a web server is returning the right headers
printf "GET /health HTTP/1.0\r\n\r\n" | nc -w5 localhost 8080
```

This bypasses any client-side caching or transformation that tools like `curl` might do.

## Port Proxying and Piping

Netcat can act as a simple proxy by combining two instances:

```bash
# Redirect traffic: anything connecting to local port 8080 goes to remote port 80
# Requires mkfifo for bidirectional piping
mkfifo /tmp/nc_pipe
nc -l 8080 < /tmp/nc_pipe | nc remote.server.com 80 > /tmp/nc_pipe
```

## UDP Mode

```bash
# Listen on UDP port 514 (syslog)
nc -lu 514

# Send a UDP packet
echo "test message" | nc -u 192.168.1.10 514

# Test UDP connectivity to a DNS server
echo "" | nc -zu -w2 8.8.8.8 53 && echo "UDP 53 open"
```

## Scanning Multiple Ports Efficiently

```bash
# Scan ports 1-1024 with 1-second timeout
nc -zv -w1 192.168.1.1 1-1024 2>&1 | grep succeeded

# Scan a list of specific ports
for port in 22 80 443 3306 5432 6379 27017; do
    nc -zw1 192.168.1.10 $port && echo "Port $port: OPEN" || echo "Port $port: CLOSED"
done
```

## Using Netcat in Monitoring Scripts

```bash
#!/bin/bash
# Simple service health check script
HOSTS=("web1.internal" "web2.internal" "web3.internal")
PORT=443

for host in "${HOSTS[@]}"; do
    if nc -zw3 "$host" "$PORT" > /dev/null 2>&1; then
        echo "$(date): $host:$PORT OK"
    else
        echo "$(date): $host:$PORT FAILED - alerting"
        # send alert here
    fi
done
```

## Security Considerations

Netcat in listen mode exposes a port on your system. Keep these points in mind:

- Firewall rules still apply; opening a port with `nc -l` does not bypass `ufw` or `iptables`
- Do not use netcat to transfer sensitive data over untrusted networks - use `scp` or `sftp` instead
- The `-e` flag (execute a program) present in some versions poses security risks and is disabled in `netcat-openbsd`
- Close listeners when done; they accept connections from any source that can reach the port

## Quick Reference

```bash
# Test TCP port
nc -zv host port

# Test UDP port
nc -zvu host port

# Listen on port
nc -l port

# Keep listener open
nc -lk port

# Send file
nc host port < file

# Receive file
nc -l port > file

# With timeout
nc -w 5 host port

# Scan port range
nc -zv host start-end
```

Netcat's simplicity is its strength. When you need to quickly verify connectivity, test a service, or move a file without setting up more complex tooling, `nc` gets the job done in a single command.
