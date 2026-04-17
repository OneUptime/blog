# How to Debug ClickHouse Network Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Debugging, Networking, Troubleshooting, Connectivity

Description: Learn how to systematically debug ClickHouse network connectivity issues including connection refusals, timeouts, and TLS errors.

---

## Common Connectivity Symptoms

- `Connection refused` on port 8123 or 9000
- `Connection timed out` when connecting to cluster peers
- TLS handshake failures
- Intermittent query failures in distributed queries
- Replication queue stuck growing

## Step 1: Verify ClickHouse Is Listening

```bash
ss -tlnp | grep clickhouse
# or
netstat -tlnp | grep clickhouse
```

Expected:

```text
LISTEN  0.0.0.0:9000   clickhouse-serv
LISTEN  0.0.0.0:8123   clickhouse-serv
```

If these are absent, ClickHouse is either not running or has a configuration error.

## Step 2: Test Basic Connectivity

From the client or peer node:

```bash
# HTTP port
curl -v "http://ch-node-1:8123/?query=SELECT+1"

# Native TCP port (telnet check)
telnet ch-node-1 9000

# Or with nc
nc -zv ch-node-1 9000
```

## Step 3: Check Firewall Rules

```bash
# On the ClickHouse host
sudo ufw status verbose
sudo iptables -L -n | grep -E "8123|9000"

# Test from a remote host
nmap -p 8123,9000 ch-node-1
```

## Step 4: Review ClickHouse Error Logs

```bash
sudo tail -f /var/log/clickhouse-server/clickhouse-server.err.log
```

Common errors to look for:

```text
"Address already in use" - port conflict
"Connection reset by peer" - firewall cutting connections
"SSL_CTX_use_certificate_file" - TLS certificate issue
"Cannot connect to ZooKeeper" - Keeper connectivity problem
```

## Step 5: Diagnose Distributed Query Connectivity

Check if the cluster is fully healthy from inside ClickHouse:

```sql
SELECT
    cluster,
    shard_num,
    host_name,
    port,
    is_local,
    errors_count,
    slowdowns_count
FROM system.clusters
WHERE cluster = 'prod_cluster';
```

High `errors_count` on a specific node points to connectivity or authentication issues.

## Step 6: Test Inter-Node Authentication

Cluster peers authenticate using the `interserver_http_credentials` settings (HTTP Basic Auth):

```bash
curl -u 'interserver_user:interserver_password' \
     "http://ch-node-2:9009/"
```

A 401 response means interserver credentials are mismatched.

## Step 7: Diagnose TLS Issues

```bash
# Test TLS handshake
openssl s_client -connect ch-node-1:9440 -servername ch-node-1

# Check certificate expiry
echo | openssl s_client -connect ch-node-1:9440 2>/dev/null | \
  openssl x509 -noout -dates
```

## Step 8: Packet Capture for Deep Diagnosis

```bash
sudo tcpdump -i eth0 -w /tmp/ch_capture.pcap \
  '(port 8123 or port 9000) and host ch-node-2'
```

Open the capture in Wireshark to see TCP handshake, TLS negotiation, and ClickHouse protocol exchanges.

## Summary

Debug ClickHouse network connectivity systematically: verify the process is listening, test basic TCP connectivity, check firewall rules, review error logs, inspect `system.clusters` for inter-node errors, and use `tcpdump` for packet-level analysis. Most issues fall into three categories - firewall blocking, credential mismatches, or TLS certificate problems.
