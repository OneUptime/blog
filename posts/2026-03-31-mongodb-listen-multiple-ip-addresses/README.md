# How to Configure MongoDB to Listen on Multiple IP Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Network, IP Address, Configuration, Binding

Description: Learn how to configure MongoDB to listen on multiple IP addresses for scenarios where mongod needs to serve traffic on both internal and external network interfaces.

---

## Why Listen on Multiple IP Addresses?

By default, MongoDB 3.6+ binds only to `127.0.0.1` (localhost). In many deployments, you need mongod to accept connections on:

- A private internal IP for application servers
- A monitoring or management IP for ops tooling
- Localhost for local admin access

Binding to multiple specific IPs is more secure than binding to `0.0.0.0` (all interfaces) because it limits which network interfaces accept connections.

## Configuring Multiple Bind IPs in mongod.conf

Use a comma-separated list in `net.bindIp`:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1,10.0.1.5
```

This binds to localhost and the private IP `10.0.1.5`. Replace with your actual internal IP addresses.

After editing `mongod.conf`, restart mongod:

```bash
sudo systemctl restart mongod
```

## Using the Command Line Flag

Pass multiple IPs using the `--bind_ip` flag:

```bash
mongod --bind_ip 127.0.0.1,10.0.1.5,10.0.2.10 --port 27017
```

## Binding to All Interfaces (Not Recommended for Production)

To accept connections on all network interfaces:

```yaml
net:
  port: 27017
  bindIpAll: true
```

Or equivalently:

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0
```

If you use `bindIpAll`, enforce access control with authentication and firewall rules - binding to all interfaces without authentication is a common cause of MongoDB data breaches.

## Verifying the Binding

After restarting, confirm mongod is listening on the expected addresses:

```bash
# Check listening ports and addresses
ss -tlnp | grep 27017

# Or with netstat
netstat -tlnp | grep 27017
```

Expected output (from `ss`):

```text
LISTEN  0  128  127.0.0.1:27017  0.0.0.0:*  users:(("mongod",...))
LISTEN  0  128  10.0.1.5:27017   0.0.0.0:*  users:(("mongod",...))
```

## Connecting to a Specific Interface

When connecting from a client, specify the exact IP:

```bash
# Connect via the private IP
mongosh "mongodb://10.0.1.5:27017"

# Connect via localhost
mongosh "mongodb://127.0.0.1:27017"
```

## Security Considerations

When binding to non-localhost interfaces, always:

1. Enable authentication in `mongod.conf`
2. Restrict access with firewall rules (iptables/ufw/security groups)
3. Use TLS for connections over non-loopback interfaces

```yaml
security:
  authorization: enabled

net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server.pem
    CAFile: /etc/ssl/mongodb/ca.pem
```

## Summary

Configure multiple bind IPs in `mongod.conf` using a comma-separated list in `net.bindIp`. This binds mongod to specific interfaces rather than all of them, reducing attack surface. Always pair multi-interface binding with authentication and firewall rules. Verify the configuration with `ss -tlnp` after restart, and prefer specific IPs over `0.0.0.0` in any environment where external network access is possible.
