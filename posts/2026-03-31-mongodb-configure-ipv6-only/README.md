# How to Configure MongoDB for IPv6 Only

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, IPv6, Network, Configuration, Binding

Description: Learn how to configure MongoDB to listen exclusively on IPv6 addresses for modern network environments that have transitioned away from IPv4.

---

## When to Use IPv6-Only MongoDB

IPv6-only configuration is appropriate when:

- Your infrastructure has fully migrated to IPv6
- Your cloud provider allocates only IPv6 addresses to instances
- You want to enforce IPv6 as a policy for new deployments
- You are deploying inside an IPv6-only Kubernetes cluster or container network

## Enabling IPv6 in mongod.conf

First, enable IPv6 support and bind to the IPv6 loopback and/or network address:

```yaml
net:
  port: 27017
  bindIp: "::1"
  ipv6: true
```

`::1` is the IPv6 loopback address, equivalent to `127.0.0.1` in IPv4. For a server that accepts remote connections:

```yaml
net:
  port: 27017
  bindIp: "::1,2001:db8::1"
  ipv6: true
```

Replace `2001:db8::1` with your actual IPv6 address. After editing, restart mongod:

```bash
sudo systemctl restart mongod
```

## Starting mongod with IPv6 Flags

```bash
mongod \
  --ipv6 \
  --bind_ip "::1,2001:db8::1" \
  --port 27017
```

Without `--ipv6` (or `ipv6: true` in config), mongod ignores IPv6 addresses in `--bind_ip`.

## Verifying IPv6-Only Binding

```bash
ss -tlnp | grep mongod
```

You should see only IPv6 sockets:

```text
State    Recv-Q  Send-Q  Local Address:Port   Peer Address:Port
LISTEN   0       128     [::1]:27017          [::]:*
LISTEN   0       128     [2001:db8::1]:27017  [::]:*
```

No `0.0.0.0:27017` entries means IPv4 is not bound.

## Connecting with an IPv6 Connection String

IPv6 addresses in URIs must be enclosed in brackets:

```javascript
// Node.js
const client = new MongoClient("mongodb://[::1]:27017");
```

```python
# Python
from pymongo import MongoClient
client = MongoClient("mongodb://[::1]:27017/")
```

```bash
# mongosh
mongosh "mongodb://[::1]:27017"
```

For a remote IPv6 address:

```bash
mongosh "mongodb://[2001:db8::1]:27017"
```

## Configuring Replica Sets for IPv6

Set replica set member hostnames to IPv6 addresses:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "[2001:db8::10]:27017" },
    { _id: 1, host: "[2001:db8::11]:27017" },
    { _id: 2, host: "[2001:db8::12]:27017" }
  ]
});
```

Ensure all members have `ipv6: true` and the correct `bindIp` in their configurations.

## DNS and Hostname Resolution

If using hostnames, confirm your DNS returns AAAA records (IPv6):

```bash
dig AAAA mongo-node1.internal
```

Using IPv6 FQDNs in replica set configurations is preferable to hardcoded addresses for easier IP changes.

## Summary

Enable IPv6-only MongoDB by setting `ipv6: true` and binding to `::1` (and any public IPv6 addresses) in `mongod.conf`. Use the `--ipv6` flag on the command line. Wrap IPv6 addresses in brackets in connection strings. Verify no IPv4 sockets appear in `ss -tlnp` output. For replica sets, configure all members with IPv6 addresses and ensure consistent `ipv6: true` settings across the cluster.
