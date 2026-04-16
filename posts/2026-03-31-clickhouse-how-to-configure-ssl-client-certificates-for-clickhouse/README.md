# How to Configure SSL Client Certificates for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SSL, TLS, Client Certificate, Security, mTLS

Description: Learn how to configure mutual TLS (mTLS) in ClickHouse using SSL client certificates to authenticate clients without passwords.

---

## What Are SSL Client Certificates

SSL client certificates (mutual TLS or mTLS) require clients to present a valid certificate signed by a trusted CA when connecting to ClickHouse. This provides strong authentication without passwords and is useful for service-to-service connections.

## Step 1 - Generate a Certificate Authority

```bash
# Create CA key and certificate
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca-cert.pem \
    -subj "/C=US/ST=California/O=MyCompany/CN=ClickHouse-CA"

# Verify
openssl x509 -in ca-cert.pem -text -noout | grep -A2 "Subject:"
```

## Step 2 - Generate Server Certificate

```bash
# Server private key and CSR
openssl genrsa -out server-key.pem 4096
openssl req -new -key server-key.pem -out server-req.pem \
    -subj "/C=US/ST=California/O=MyCompany/CN=clickhouse-server"

# Sign with CA
openssl x509 -req -days 3650 \
    -in server-req.pem \
    -CA ca-cert.pem \
    -CAkey ca-key.pem \
    -CAcreateserial \
    -out server-cert.pem

# Copy to ClickHouse config directory
cp ca-cert.pem /etc/clickhouse-server/
cp server-cert.pem /etc/clickhouse-server/
cp server-key.pem /etc/clickhouse-server/
chown clickhouse:clickhouse /etc/clickhouse-server/*.pem
chmod 600 /etc/clickhouse-server/server-key.pem
```

## Step 3 - Generate Client Certificate

```bash
# Client private key and CSR
openssl genrsa -out client-key.pem 4096
openssl req -new -key client-key.pem -out client-req.pem \
    -subj "/C=US/ST=California/O=MyCompany/CN=my-app-client"

# Sign with CA
openssl x509 -req -days 3650 \
    -in client-req.pem \
    -CA ca-cert.pem \
    -CAkey ca-key.pem \
    -CAcreateserial \
    -out client-cert.pem
```

## Step 4 - Configure ClickHouse Server for SSL

In `config.xml`:

```xml
<https_port>8443</https_port>
<tcp_port_secure>9440</tcp_port_secure>

<openSSL>
    <server>
        <certificateFile>/etc/clickhouse-server/server-cert.pem</certificateFile>
        <privateKeyFile>/etc/clickhouse-server/server-key.pem</privateKeyFile>
        <caConfig>/etc/clickhouse-server/ca-cert.pem</caConfig>
        <verificationMode>strict</verificationMode>
        <loadDefaultCAFile>true</loadDefaultCAFile>
        <cacheSessions>true</cacheSessions>
        <disableProtocols>sslv2,sslv3</disableProtocols>
        <preferServerCiphers>true</preferServerCiphers>
    </server>

    <client>
        <caConfig>/etc/clickhouse-server/ca-cert.pem</caConfig>
        <verificationMode>strict</verificationMode>
        <loadDefaultCAFile>true</loadDefaultCAFile>
    </client>
</openSSL>
```

## Step 5 - Configure User to Require Client Certificate

In `users.xml`:

```xml
<users>
    <my_app>
        <ssl_certificates>
            <common_name>my-app-client</common_name>
        </ssl_certificates>
        <networks>
            <ip>::/0</ip>
        </networks>
        <profile>default</profile>
        <quota>default</quota>
    </my_app>
</users>
```

## Step 6 - Connect with Client Certificate

`clickhouse-client` does not expose direct CLI flags for client certificate files; the paths are supplied through the client's config file (e.g. `~/.clickhouse-client/config.xml` or a path passed with `--config-file`):

```xml
<config>
    <openSSL>
        <client>
            <caConfig>ca-cert.pem</caConfig>
            <certificateFile>client-cert.pem</certificateFile>
            <privateKeyFile>client-key.pem</privateKeyFile>
            <verificationMode>strict</verificationMode>
            <loadDefaultCAFile>false</loadDefaultCAFile>
        </client>
    </openSSL>
</config>
```

Then connect using `--secure`:

```bash
clickhouse-client \
    --host clickhouse-server \
    --port 9440 \
    --secure \
    --user my_app \
    --query "SELECT currentUser()"
```

## Python Client with SSL Certificates

```python
from clickhouse_driver import Client

client = Client(
    host='clickhouse-server',
    port=9440,
    user='my_app',
    password='',
    secure=True,
    verify=True,
    ca_certs='ca-cert.pem',
    certfile='client-cert.pem',
    keyfile='client-key.pem'
)

result = client.execute('SELECT currentUser()')
print(result)
```

## Node.js Client with SSL Certificates

```javascript
import { createClient } from '@clickhouse/client';
import { readFileSync } from 'fs';

const client = createClient({
  url: 'https://clickhouse-server:8443',
  username: 'my_app',
  tls: {
    ca_cert: readFileSync('ca-cert.pem'),
    cert: readFileSync('client-cert.pem'),
    key: readFileSync('client-key.pem'),
  },
});
```

## Verifying SSL Connections

```bash
# Test SSL with openssl
openssl s_client \
    -connect clickhouse-server:9440 \
    -cert client-cert.pem \
    -key client-key.pem \
    -CAfile ca-cert.pem

# Check certificate details
openssl x509 -in client-cert.pem -text -noout | grep -E "Subject:|Issuer:|Not After"
```

## Monitoring SSL Connections

```sql
SELECT
    event_time,
    user,
    client_hostname,
    interface,
    type
FROM system.session_log
WHERE interface = 'TCP'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;
```

## Summary

Mutual TLS authentication in ClickHouse uses SSL client certificates signed by a trusted CA to authenticate clients without passwords. Generate CA, server, and client certificates with OpenSSL, configure the server certificate and CA in `config.xml`, and use `<ssl_certificates><common_name>` in `users.xml` to bind a user to their certificate's CN. Clients must present their certificate when connecting on the secure port (8443/9440).
