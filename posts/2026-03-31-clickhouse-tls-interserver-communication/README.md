# How to Enable TLS for ClickHouse Interserver Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TLS, Security, Replication, Cluster, Encryption

Description: Learn how to enable TLS encryption for ClickHouse interserver communication to secure replication and distributed query traffic between cluster nodes.

---

In a ClickHouse cluster, nodes communicate with each other for replication and distributed query execution. By default this traffic is unencrypted. Enabling TLS for interserver communication protects data as it moves between nodes on your network.

## How Interserver Communication Works

ClickHouse nodes use an interserver HTTP endpoint (default port 9009) for replication. When you run distributed queries, the initiating node fetches data from replicas via this port. Securing it with TLS prevents eavesdropping on inter-node traffic.

## Generating Certificates for Each Node

Each ClickHouse node should have its own certificate. You can use a shared CA:

```bash
# On each node, generate a key and CSR
openssl genrsa -out /etc/clickhouse-server/interserver.key 4096
openssl req -new \
  -key /etc/clickhouse-server/interserver.key \
  -out /etc/clickhouse-server/interserver.csr \
  -subj "/CN=$(hostname -f)"

# Sign with your CA
openssl x509 -req -days 365 \
  -in /etc/clickhouse-server/interserver.csr \
  -CA /etc/ssl/certs/clickhouse-ca.crt \
  -CAkey /etc/ssl/private/clickhouse-ca.key \
  -CAcreateserial \
  -out /etc/clickhouse-server/interserver.crt
```

## Configuring Interserver TLS in config.xml

Enable the secure interserver port and configure TLS:

```text
<!-- Secure interserver port (replaces 9009) -->
<interserver_https_port>9010</interserver_https_port>

<!-- Secure native TCP port for distributed queries -->
<tcp_port_secure>9440</tcp_port_secure>

<!-- Remove or comment out the plaintext interserver port -->
<!-- <interserver_http_port>9009</interserver_http_port> -->

<openSSL>
  <server>
    <certificateFile>/etc/clickhouse-server/interserver.crt</certificateFile>
    <privateKeyFile>/etc/clickhouse-server/interserver.key</privateKeyFile>
    <caConfig>/etc/ssl/certs/clickhouse-ca.crt</caConfig>
    <verificationMode>relaxed</verificationMode>
    <loadDefaultCAFile>false</loadDefaultCAFile>
    <cacheSessions>true</cacheSessions>
    <disableProtocols>sslv2,sslv3</disableProtocols>
  </server>
  <client>
    <caConfig>/etc/ssl/certs/clickhouse-ca.crt</caConfig>
    <verificationMode>relaxed</verificationMode>
  </client>
</openSSL>
```

## Updating Remote Server Definitions

In your `remote_servers` configuration, update each shard/replica to use the secure native TCP port for distributed queries:

```text
<remote_servers>
  <production_cluster>
    <shard>
      <replica>
        <host>ch-node-01.internal</host>
        <port>9440</port>
        <secure>1</secure>
      </replica>
      <replica>
        <host>ch-node-02.internal</host>
        <port>9440</port>
        <secure>1</secure>
      </replica>
    </shard>
  </production_cluster>
</remote_servers>
```

## Setting Interserver Credentials

Use interserver credentials to authenticate node-to-node connections:

```text
<interserver_http_credentials>
  <user>interserver_user</user>
  <password>InterserverSecretPass!</password>
</interserver_http_credentials>
```

These credentials must match on all nodes.

## Verifying Replication Over TLS

Check replication status after enabling TLS:

```sql
SELECT
  database,
  table,
  replica_name,
  is_leader,
  is_readonly,
  absolute_delay
FROM system.replicas
WHERE absolute_delay > 0
ORDER BY absolute_delay DESC;
```

Monitor interserver connections:

```sql
SELECT
  client_hostname,
  query_kind,
  event_time,
  query
FROM system.query_log
WHERE client_hostname != hostname()
  AND type = 'QueryStart'
ORDER BY event_time DESC
LIMIT 10;
```

## Firewall Configuration

Update firewall rules to allow the new secure port:

```bash
# Allow secure interserver port from cluster nodes only
ufw allow from 10.0.0.0/24 to any port 9010 proto tcp
ufw deny 9009/tcp
```

## Best Practices

- Use the same CA for all cluster nodes to simplify certificate management
- Set `verificationMode = strict` in production to enforce certificate validation
- Rotate certificates before expiry using your PKI's renewal process
- Monitor certificate expiry to avoid replication failures

```bash
openssl x509 -in /etc/clickhouse-server/interserver.crt -noout -dates
```

## Summary

Enabling TLS for ClickHouse interserver communication secures replication traffic between cluster nodes. Configure `interserver_https_port`, provide server and client TLS settings in `config.xml`, update remote server definitions to use secure connections, and disable the plaintext interserver port to complete the setup.
