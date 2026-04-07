# How to Configure MongoDB for IPv4 Only

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, IPv4, Network, Configuration, Binding

Description: Learn how to configure MongoDB to listen exclusively on IPv4 addresses and disable IPv6 to simplify networking in environments that do not use IPv6.

---

## Why Restrict MongoDB to IPv4

Restricting MongoDB to IPv4 is useful when:

- Your network infrastructure does not support IPv6
- You want simpler firewall rules without dual-stack complexity
- A compliance policy mandates IPv4-only communication
- You are troubleshooting connectivity issues caused by unintended IPv6 bindings

## Configuring IPv4-Only in mongod.conf

Bind only to the IPv4 loopback and IPv4 addresses:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
  ipv6: false
```

For a production server that also needs to accept remote connections:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1,10.0.1.20
  ipv6: false
```

`ipv6: false` explicitly disables IPv6 socket binding even if the OS supports it. After editing, restart mongod:

```bash
sudo systemctl restart mongod
```

## Starting mongod with IPv4-Only Flags

Using the command line:

```bash
mongod \
  --bind_ip 127.0.0.1,10.0.1.20 \
  --port 27017
```

By not passing the `--ipv6` flag, mongod will not bind to any IPv6 addresses (IPv6 is disabled by default).

## Verifying IPv4-Only Binding

After restart, confirm no IPv6 sockets are open:

```bash
ss -tlnp | grep mongod
```

You should see only IPv4 entries (lines with IPv4 addresses, no `::1` or `[::]:27017`):

```text
State    Recv-Q  Send-Q  Local Address:Port  Peer Address:Port
LISTEN   0       128     127.0.0.1:27017    0.0.0.0:*
LISTEN   0       128     10.0.1.20:27017    0.0.0.0:*
```

If `::1:27017` or `:::27017` appears, `ipv6: false` was not applied correctly.

## Connecting with an IPv4 Connection String

Ensure client connection strings use IPv4 addresses explicitly:

```javascript
const client = new MongoClient("mongodb://127.0.0.1:27017");
// Not: mongodb://localhost:27017 (may resolve to ::1 on some systems)
```

On systems where `localhost` resolves to `::1` by default, always use the numeric IPv4 address `127.0.0.1` when IPv6 is disabled.

## Disabling IPv6 on the Operating System

For full IPv4-only operation, also disable IPv6 at the OS level:

```bash
# Disable IPv6 on Linux (requires reboot)
echo "net.ipv6.conf.all.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

Disabling IPv6 at the OS level also prevents other processes from accidentally using IPv6.

## Summary

Configure MongoDB for IPv4-only by setting `ipv6: false` in `mongod.conf` and binding only to IPv4 addresses in `net.bindIp`. On the command line, simply omit the `--ipv6` flag since IPv6 is disabled by default. Verify with `ss -tlnp` that no IPv6 sockets are listening. Use numeric IPv4 addresses (`127.0.0.1`) in connection strings on systems where `localhost` resolves to IPv6, and optionally disable IPv6 at the OS level for complete isolation.
