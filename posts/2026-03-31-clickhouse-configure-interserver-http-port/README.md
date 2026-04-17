# How to Configure ClickHouse Interserver HTTP Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Interserver HTTP Port, Cluster Configuration, Replication, Network

Description: Learn how to configure the ClickHouse interserver HTTP port used for replica synchronization and distributed table operations between cluster nodes.

---

The interserver HTTP port in ClickHouse is used for communication between cluster nodes. Replicas use it to exchange data parts during replication, and distributed tables use it for remote reads. Understanding and properly configuring this port is essential for building and maintaining a reliable ClickHouse cluster.

## Default Port

By default, ClickHouse uses port 9009 for interserver HTTP communication:

```xml
<!-- config.xml default -->
<interserver_http_port>9009</interserver_http_port>
```

## What Uses the Interserver Port

- **ReplicatedMergeTree replication**: Nodes exchange data parts when syncing replicas
- **Distributed table reads**: Nodes forward query fragments to remote shards
- **Fetch commands**: Manual data part fetches with `ALTER TABLE ... FETCH PARTITION`

## Configuring the Port

```xml
<!-- /etc/clickhouse-server/config.xml -->
<interserver_http_port>9009</interserver_http_port>
```

Change the port if 9009 conflicts with other services:

```xml
<interserver_http_port>19009</interserver_http_port>
```

## Interserver HTTP Host

Configure the hostname or IP other nodes will use to reach this server:

```xml
<interserver_http_host>10.0.1.15</interserver_http_host>
```

This is important when the server has multiple network interfaces. Set it to the interface reachable by other cluster nodes.

You can also use the server's hostname:

```xml
<interserver_http_host>clickhouse-node-1.internal.example.com</interserver_http_host>
```

## Securing Interserver Communication with HTTPS

Replace the plain HTTP port with an HTTPS port:

```xml
<!-- config.xml -->
<interserver_https_port>9010</interserver_https_port>
<!-- Remove or comment out: -->
<!-- <interserver_http_port>9009</interserver_http_port> -->
```

Configure TLS for interserver in the OpenSSL section:

```xml
<openSSL>
    <server>
        <certificateFile>/etc/clickhouse-server/server.crt</certificateFile>
        <privateKeyFile>/etc/clickhouse-server/server.key</privateKeyFile>
        <verificationMode>none</verificationMode>
    </server>
</openSSL>
```

## Interserver Authentication

ClickHouse supports interserver authentication via a shared secret:

```xml
<!-- config.xml -->
<interserver_http_credentials>
    <user>interserver</user>
    <password>strong_shared_secret</password>
</interserver_http_credentials>
```

All nodes in the cluster must have the same credentials configured.

## Firewall Rules

Only cluster nodes should access the interserver port. Configure your firewall:

```bash
# Allow interserver port only from cluster nodes
iptables -A INPUT -p tcp --dport 9009 \
    -s 10.0.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 9009 -j DROP
```

## Verifying Interserver Connectivity

Check that replication is working by monitoring replica queues:

```sql
SELECT
    database,
    table,
    replica_name,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE queue_size > 0
ORDER BY queue_size DESC;
```

Check for fetch errors:

```sql
SELECT *
FROM system.replication_queue
WHERE type = 'GET_PART'
  AND num_tries > 3
ORDER BY create_time DESC;
```

## Troubleshooting

If replication is stalled, verify interserver connectivity:

```bash
# From node 2, test node 1's interserver port is reachable
nc -zv 10.0.1.10 9009
# Should report: succeeded / open
```

## Summary

The interserver HTTP port is the backbone of ClickHouse cluster communication, enabling data replication and distributed query execution. Configure `interserver_http_host` explicitly when nodes have multiple network interfaces. Secure it with HTTPS and interserver credentials in production environments. Always restrict access to the interserver port via firewall rules to prevent unauthorized data access between untrusted networks.
