# How to Troubleshoot TCP Connection Refused Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Troubleshooting, Linux, Firewall, Port

Description: Diagnose TCP Connection Refused errors by identifying whether the service is not running, the port is blocked, or the connection is being actively rejected.

## Introduction

"Connection Refused" means the destination host is reachable, or a firewall on the path is responding, but your connection attempt was actively rejected. In TCP terms, the server or firewall sent a RST packet in response to your SYN. This is different from a timeout (where no response arrives) - a refusal is an explicit rejection. The distinction immediately narrows your investigation.

## Symptoms and Quick Test

```bash
# Connection refused example with curl:

curl http://10.20.0.5:8080
# curl: (7) Failed to connect to 10.20.0.5 port 8080: Connection refused

# With telnet:
telnet 10.20.0.5 8080
# Trying 10.20.0.5...
# telnet: Unable to connect to remote host: Connection refused

# With nc:
nc -zv 10.20.0.5 8080
# nc: connect to 10.20.0.5 port 8080 (tcp) failed: Connection refused
```

## Root Causes

### Cause 1: Service Not Running

```bash
# Check if the service is listening on the expected port
ss -tlnp | grep ":8080"
# or, on older systems with net-tools installed
netstat -tlnp | grep ":8080"

# If nothing: no process is listening on that port
systemctl status myapp
systemctl start myapp

# Check if service binds to all interfaces or only localhost
ss -tlnp | grep ":8080"
# "0.0.0.0:8080" = all IPv4 interfaces (remotely reachable if routing/firewall allow)
# "127.0.0.1:8080" = loopback only (not accessible remotely)
```

### Cause 2: Service Listening on Wrong IP/Interface

```bash
# Application may be bound to 127.0.0.1 instead of 0.0.0.0
ss -tlnp | grep 8080
# tcp LISTEN 0 128 127.0.0.1:8080 ...   <- bound to loopback only

# Fix: change application config to bind to 0.0.0.0 or specific interface IP
# Example: nginx
server {
    listen 0.0.0.0:8080;   # Changed from 127.0.0.1:8080
}
```

### Cause 3: Firewall Rejecting with RST

```bash
# iptables REJECT with tcp-reset sends RST back (appears as connection refused)
iptables -L INPUT -n --line-numbers | grep "8080"

# If you see a REJECT rule for port 8080 with reject-with tcp-reset:
iptables -D INPUT -p tcp --dport 8080 -j REJECT --reject-with tcp-reset

# Or adjust to ACCEPT
iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
```

### Cause 4: Low Port Requires Privileges

```bash
# Privileged ports (< 1024) require root or CAP_NET_BIND_SERVICE on Linux
# If running as non-root without that capability and binding to port 80, it fails
ss -tlnp | grep ":80"   # Check if anything is listening

# Check application logs for bind errors
journalctl -u nginx | grep "bind"
# "bind() to 0.0.0.0:80 failed (13: Permission denied)"
# Fix: run as root, or use setcap
setcap 'cap_net_bind_service=+ep' /usr/bin/myapp
```

## Capturing the RST Packet

```bash
# Capture to confirm the server or firewall is sending RST
tcpdump -i eth0 -n 'tcp and host 10.20.0.5 and port 8080'

# Expected output for connection refused:
# Client > Server: Flags [S]      <- SYN sent
# Server/Firewall > Client: Flags [R.]     <- RST received (connection refused)
```

## Conclusion

Connection Refused is an explicit rejection - either no service is listening, the service is bound to the wrong interface, or a firewall is sending RST. Start with `ss -tlnp` to verify what's listening where, then check firewall rules if the service is running correctly. Capturing with tcpdump confirms the RST is genuinely coming from the server or firewall (vs a timeout where you see SYN retries but no response).
