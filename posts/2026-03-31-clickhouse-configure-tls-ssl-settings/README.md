# How to Configure ClickHouse TLS/SSL Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TLS, SSL, Security, Encryption, Certificate

Description: Learn how to configure TLS/SSL encryption in ClickHouse for the native TCP port, HTTP interface, and interserver communication to secure data in transit.

---

ClickHouse communicates over several ports that should be encrypted in production: the native TCP port (9000), the HTTP interface (8123), and the interserver HTTP port (9009). Enabling TLS/SSL ensures data in transit between clients and servers, and between cluster nodes, is encrypted and authenticated.

## Certificate Setup

Generate or obtain your TLS certificates. For internal use, you can use a self-signed certificate:

```bash
# Generate self-signed certificate and key
openssl req -x509 -newkey rsa:4096 \
    -keyout /etc/clickhouse-server/server.key \
    -out /etc/clickhouse-server/server.crt \
    -days 365 -nodes \
    -subj "/CN=clickhouse.example.com"

# Set correct permissions
chmod 600 /etc/clickhouse-server/server.key
chown clickhouse:clickhouse /etc/clickhouse-server/server.key
```

## Configuring TLS in config.xml

```xml
<!-- /etc/clickhouse-server/config.xml -->
<openSSL>
    <server>
        <certificateFile>/etc/clickhouse-server/server.crt</certificateFile>
        <privateKeyFile>/etc/clickhouse-server/server.key</privateKeyFile>
        <verificationMode>none</verificationMode>
        <!-- For mutual TLS, use: relaxed or strict -->
        <caConfig>/etc/clickhouse-server/ca.crt</caConfig>
        <loadDefaultCAFile>true</loadDefaultCAFile>
        <cacheSessions>true</cacheSessions>
        <disableProtocols>sslv2,sslv3</disableProtocols>
        <preferServerCiphers>true</preferServerCiphers>
    </server>
    <client>
        <loadDefaultCAFile>true</loadDefaultCAFile>
        <cacheSessions>true</cacheSessions>
        <disableProtocols>sslv2,sslv3</disableProtocols>
        <preferServerCiphers>true</preferServerCiphers>
        <verificationMode>none</verificationMode>
    </client>
</openSSL>
```

## Enabling HTTPS Interface

```xml
<!-- config.xml -->
<https_port>8443</https_port>
```

Disable the plain HTTP port if desired:

```xml
<!-- Comment out or remove: -->
<!-- <http_port>8123</http_port> -->
```

## Enabling Native TLS Port

```xml
<!-- config.xml -->
<tcp_port_secure>9440</tcp_port_secure>
```

## Securing Interserver Communication

```xml
<!-- config.xml -->
<interserver_https_port>9010</interserver_https_port>
<!-- Remove or disable: -->
<!-- <interserver_http_port>9009</interserver_http_port> -->
```

## Connecting with TLS

Using clickhouse-client:

```bash
clickhouse-client \
    --host clickhouse.example.com \
    --port 9440 \
    --secure \
    --password mypassword
```

Via HTTP with curl:

```bash
curl --cacert /path/to/ca.crt \
    "https://clickhouse.example.com:8443/?query=SELECT+1"
```

## Mutual TLS (Client Authentication)

For stronger security, require clients to present certificates:

```xml
<openSSL>
    <server>
        <verificationMode>strict</verificationMode>
        <caConfig>/etc/clickhouse-server/ca.crt</caConfig>
    </server>
</openSSL>
```

Connect with a client certificate. `clickhouse-client` does not expose CLI flags for certificate and key paths; configure them via the client's config file (for example `~/.clickhouse-client/config.xml` or a file passed with `--config-file`):

```xml
<!-- ~/.clickhouse-client/config.xml -->
<config>
    <openSSL>
        <client>
            <certificateFile>/etc/clickhouse-client/client.crt</certificateFile>
            <privateKeyFile>/etc/clickhouse-client/client.key</privateKeyFile>
            <caConfig>/etc/clickhouse-client/ca.crt</caConfig>
            <verificationMode>strict</verificationMode>
            <loadDefaultCAFile>true</loadDefaultCAFile>
        </client>
    </openSSL>
</config>
```

Then connect normally with `--secure`:

```bash
clickhouse-client \
    --host clickhouse.example.com \
    --port 9440 \
    --secure
```

## Verifying TLS is Active

TLS is a server/transport configuration, not a runtime setting, so there is no single flag to query. Confirm the secure ports are listening and check per-interface connection metrics:

```bash
ss -tlnp | grep -E '8443|9440|9010'
```

Check active connections broken down by interface:

```sql
SELECT metric, value
FROM system.metrics
WHERE metric LIKE '%Connection%';
```

## Summary

Enabling TLS/SSL in ClickHouse secures all data in transit between clients and the server, and between cluster nodes. Configure the `openSSL` section in config.xml with your certificate and key, enable secure ports (8443 for HTTPS, 9440 for native TLS), and optionally enforce mutual TLS for strong client authentication. Always disable unencrypted ports in production environments where data security is required.
