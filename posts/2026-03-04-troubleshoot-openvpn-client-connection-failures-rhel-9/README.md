# How to Troubleshoot OpenVPN Client Connection Failures on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, OpenVPN, Troubleshooting, Linux

Description: A systematic troubleshooting guide for diagnosing and fixing OpenVPN client connection failures on RHEL, covering TLS errors, certificate problems, routing issues, and firewall conflicts.

---

OpenVPN is more verbose than WireGuard when things go wrong, which is actually helpful for troubleshooting. The log messages tell you exactly where in the connection process things failed. The trick is knowing what each error means and how to fix it.

## The Connection Lifecycle

Understanding where failures happen helps narrow down the problem.

```mermaid
flowchart TD
    A[Client starts] --> B[DNS resolution of endpoint]
    B --> C[TCP/UDP connection to server port]
    C --> D[TLS handshake]
    D --> E[Certificate verification]
    E --> F[Authentication - username/password]
    F --> G[Tunnel setup - tun device]
    G --> H[Route and DNS push]
    H --> I[Connected]

    B -->|Fail| B1[DNS error]
    C -->|Fail| C1[Port blocked / server down]
    D -->|Fail| D1[TLS mismatch / cipher issue]
    E -->|Fail| E1[Certificate expired / revoked]
    F -->|Fail| F1[Bad credentials]
    G -->|Fail| G1[Permissions / SELinux]
    H -->|Fail| H1[Routing conflict]
```

## Increasing Log Verbosity

First, get more information from both sides.

```bash
# On the server, increase verbosity temporarily
# In /etc/openvpn/server/server.conf, change:
# verb 3
# to:
# verb 5

# Restart to apply
sudo systemctl restart openvpn-server@server

# Watch the log
sudo tail -f /var/log/openvpn/openvpn.log
```

On the client:

```bash
# Run the client manually with high verbosity
sudo openvpn --config /path/to/client.ovpn --verb 5
```

## Problem 1: Cannot Reach the Server

The client can't even establish a connection.

```bash
# Test basic connectivity
ping -c 4 vpn.example.com

# Test the specific port
nc -zvu vpn.example.com 1194

# If UDP, use a timeout since nc won't show success clearly
timeout 5 bash -c "echo test | nc -u vpn.example.com 1194"
```

Common causes:
- Server is not running (`sudo systemctl status openvpn-server@server`)
- Firewall blocking the port (`sudo firewall-cmd --list-ports`)
- Wrong IP or port in client config
- ISP or corporate firewall blocking UDP 1194

```bash
# On the server, verify OpenVPN is listening
ss -ulnp | grep 1194
```

## Problem 2: TLS Handshake Failed

You see messages like "TLS Error" or "TLS handshake failed" in the logs.

```bash
# Common TLS errors in the log:
# "TLS Error: TLS key negotiation failed to occur within 60 seconds"
# "TLS Error: TLS handshake failed"
```

This usually means:

1. **Mismatched protocols** - Server uses UDP, client config says TCP (or vice versa)
2. **Mismatched tls-auth keys** - The ta.key file is different on server and client
3. **Wrong key-direction** - Server uses 0, client should use 1

```bash
# Check protocol in server config
grep proto /etc/openvpn/server/server.conf

# Verify tls-auth direction
# Server should have: tls-auth ta.key 0
# Client should have: tls-auth ta.key 1 (or key-direction 1)

# Compare ta.key checksums on both sides
md5sum /etc/openvpn/server/ta.key
# Compare with the client's copy
```

## Problem 3: Certificate Verification Failed

Messages like "VERIFY ERROR" or "certificate verify failed."

```bash
# Check certificate dates
openssl x509 -in /etc/openvpn/server/server.crt -noout -dates
openssl x509 -in /etc/openvpn/server/ca.crt -noout -dates

# Verify the server cert was signed by the CA
openssl verify -CAfile /etc/openvpn/server/ca.crt /etc/openvpn/server/server.crt
```

Common causes:
- Certificate expired - regenerate it
- CA mismatch - client has a different ca.crt than what signed the server cert
- Clock skew - if the system time is way off, certificate validation fails
- Certificate revoked - check the CRL

```bash
# Check the system time
timedatectl

# If time is off, sync it
sudo chronyc makestep
```

## Problem 4: Authentication Failed (LDAP/PAM)

When using username/password authentication, you see "AUTH_FAILED" in the client log.

```bash
# Test LDAP connectivity from the server
ldapsearch -H ldaps://ldap.example.com:636 \
    -D "CN=openvpn-svc,OU=Service Accounts,DC=example,DC=com" \
    -W \
    -b "OU=Users,DC=example,DC=com" \
    "(sAMAccountName=testuser)"

# Check if the auth-ldap plugin is loaded
grep plugin /etc/openvpn/server/server.conf
ls -la /usr/lib64/openvpn/plugin/lib/openvpn-auth-ldap.so
```

## Problem 5: Tunnel Comes Up but No Traffic Flows

The connection succeeds, but you can't ping anything through the tunnel.

```bash
# On the client, check the tun interface
ip addr show tun0

# Check routing
ip route show

# On the server, check IP forwarding
sysctl net.ipv4.ip_forward

# Check masquerading
sudo firewall-cmd --query-masquerade

# Check for SELinux denials
sudo ausearch -m avc --start recent | grep openvpn
```

## Problem 6: DNS Not Working Through the VPN

You can ping by IP but not by hostname.

```bash
# Check what DNS servers were pushed
cat /etc/resolv.conf

# Or check with resolvectl
resolvectl status

# Test DNS directly
dig @1.1.1.1 example.com

# If DNS push isn't working, check server config
grep "dhcp-option" /etc/openvpn/server/server.conf
```

On RHEL with NetworkManager, the DNS push might not work automatically. You may need:

```bash
# Install the OpenVPN NetworkManager plugin
sudo dnf install -y NetworkManager-openvpn

# Or use a custom script to update DNS
# In client.ovpn:
# script-security 2
# up /etc/openvpn/update-resolv-conf
# down /etc/openvpn/update-resolv-conf
```

## Problem 7: Connection Drops Frequently

```bash
# Check the keepalive settings in server config
grep keepalive /etc/openvpn/server/server.conf
# Should be something like: keepalive 10 120

# Check if the server is overloaded
top -bn1 | head -5

# Check connection status
sudo cat /var/log/openvpn/openvpn-status.log

# Look for patterns in the log
sudo grep "Connection reset" /var/log/openvpn/openvpn.log | tail -20
```

## Problem 8: SELinux Blocking OpenVPN

RHEL's SELinux can interfere with OpenVPN, especially with custom paths.

```bash
# Check for SELinux denials
sudo ausearch -m avc -ts recent | grep openvpn

# If SELinux is blocking, check the boolean settings
getsebool -a | grep openvpn

# Common fix: allow OpenVPN to connect to networks
sudo setsebool -P openvpn_can_network_connect on

# If using custom paths, fix the context
sudo semanage fcontext -a -t openvpn_etc_t "/custom/path/to/openvpn(/.*)?"
sudo restorecon -Rv /custom/path/to/openvpn
```

## Quick Diagnostic Script

Run this on the server to get a snapshot of the OpenVPN state:

```bash
echo "=== OpenVPN Service ==="
sudo systemctl status openvpn-server@server --no-pager

echo "=== Listening ==="
ss -ulnp | grep 1194

echo "=== IP Forwarding ==="
sysctl net.ipv4.ip_forward

echo "=== Firewall ==="
sudo firewall-cmd --list-all

echo "=== Masquerade ==="
sudo firewall-cmd --query-masquerade

echo "=== TUN Interface ==="
ip addr show tun0 2>/dev/null || echo "tun0 not found"

echo "=== Recent Log Entries ==="
sudo tail -20 /var/log/openvpn/openvpn.log

echo "=== SELinux ==="
getenforce
sudo ausearch -m avc -ts recent 2>/dev/null | grep openvpn | tail -5
```

## Wrapping Up

OpenVPN troubleshooting on RHEL follows the connection lifecycle: network reachability, TLS handshake, certificate verification, authentication, tunnel setup, and routing. The logs are your best friend here. Increase verbosity, check both server and client logs, and work through each stage systematically. Most issues come down to certificate mismatches, firewall rules, or missing IP forwarding.
