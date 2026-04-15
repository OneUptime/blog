# How to Use SSL Client Certificate Authentication in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SSL, Security, Authentication, Database, TLS, Certificate

Description: Learn how to configure ClickHouse to authenticate clients using SSL/TLS certificates so services can connect without passwords using mutual TLS.

---

SSL client certificate authentication (also called mutual TLS or mTLS) allows clients to prove their identity to ClickHouse using an X.509 certificate instead of a password. This is the preferred authentication method for service-to-service connections where storing passwords is undesirable and certificate rotation is managed by a PKI infrastructure.

## How mTLS Authentication Works

In standard TLS, only the server presents a certificate to the client. In mutual TLS:

1. The server presents its certificate to the client
2. The client presents its own certificate to the server
3. The server verifies the client certificate against a trusted CA
4. If verification succeeds, the connection is authenticated

ClickHouse identifies the user based on the Common Name (CN) or Subject Alternative Name (SAN) in the client certificate.

## Generating a Certificate Authority

For a self-managed PKI, create a CA that signs both server and client certificates:

```bash
# Create CA key and self-signed certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=ClickHouse CA/O=Corp/C=US"
```

## Generating the Server Certificate

```bash
# Server private key
openssl genrsa -out server.key 2048

# Server CSR
openssl req -new -key server.key -out server.csr \
  -subj "/CN=clickhouse.corp.example.com/O=Corp/C=US"

# Sign with CA
openssl x509 -req -days 730 -in server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt
```

## Generating a Client Certificate

```bash
# Client key and CSR
openssl genrsa -out client_alice.key 2048
openssl req -new -key client_alice.key -out client_alice.csr \
  -subj "/CN=alice/O=Corp/C=US"

# Sign with CA
openssl x509 -req -days 365 -in client_alice.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out client_alice.crt
```

The `CN=alice` value will be used to identify the user in ClickHouse.

## Placing Certificates on the Server

```bash
mkdir -p /etc/clickhouse-server/certs
cp ca.crt     /etc/clickhouse-server/certs/
cp server.crt /etc/clickhouse-server/certs/
cp server.key /etc/clickhouse-server/certs/
chown -R clickhouse:clickhouse /etc/clickhouse-server/certs/
chmod 600 /etc/clickhouse-server/certs/server.key
```

## Configuring TLS in ClickHouse

Edit `/etc/clickhouse-server/config.xml` or create `/etc/clickhouse-server/config.d/tls.xml`:

```xml
<clickhouse>
  <tcp_port_secure>9440</tcp_port_secure>
  <https_port>8443</https_port>

  <openSSL>
    <server>
      <!-- Server certificate and private key -->
      <certificateFile>/etc/clickhouse-server/certs/server.crt</certificateFile>
      <privateKeyFile>/etc/clickhouse-server/certs/server.key</privateKeyFile>
      <!-- CA cert used to verify client certificates -->
      <caConfig>/etc/clickhouse-server/certs/ca.crt</caConfig>
      <!-- Require clients to present a certificate -->
      <verificationMode>strict</verificationMode>
      <loadDefaultCAFile>false</loadDefaultCAFile>
      <!-- Disable older protocols to enforce TLS 1.2+ -->
      <preferServerCiphers>true</preferServerCiphers>
      <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>
    </server>

    <client>
      <caConfig>/etc/clickhouse-server/certs/ca.crt</caConfig>
      <verificationMode>relaxed</verificationMode>
    </client>
  </openSSL>
</clickhouse>
```

Setting `verificationMode` to `strict` requires all clients to present a valid certificate signed by the configured CA. Use `relaxed` to make client certificates optional.

## Creating a User Mapped to a Client Certificate

Create a ClickHouse user whose identity is tied to the certificate CN:

```sql
CREATE USER alice
    IDENTIFIED WITH ssl_certificate CN 'alice';

GRANT SELECT ON analytics.* TO alice;
```

When `alice` connects with a certificate where `CN=alice`, ClickHouse automatically logs them in as the `alice` user.

## Using users.xml for Certificate Authentication

Add the user definition in `/etc/clickhouse-server/users.xml`:

```xml
<users>
  <alice>
    <ssl_certificates>
      <common_name>alice</common_name>
    </ssl_certificates>
    <networks>
      <ip>::/0</ip>
    </networks>
    <profile>default</profile>
    <quota>default</quota>
  </alice>
</users>
```

## Connecting with clickhouse-client

```bash
clickhouse-client \
  --host clickhouse.corp.example.com \
  --port 9440 \
  --secure \
  --certificate /path/to/client_alice.crt \
  --private_key /path/to/client_alice.key \
  --ca_certificate /path/to/ca.crt \
  --user alice
```

## Connecting over HTTPS

```bash
curl --cacert /path/to/ca.crt \
     --cert /path/to/client_alice.crt \
     --key /path/to/client_alice.key \
     "https://clickhouse.corp.example.com:8443/?query=SELECT+1&user=alice"
```

## Connecting with the Python Driver

```python
import clickhouse_driver

client = clickhouse_driver.Client(
    host='clickhouse.corp.example.com',
    port=9440,
    secure=True,
    ca_certs='/path/to/ca.crt',
    certfile='/path/to/client_alice.crt',
    keyfile='/path/to/client_alice.key',
    user='alice'
)

result = client.execute('SELECT 1')
print(result)
```

## Matching on Multiple CNs

A user can be granted access if they present any certificate in a list of allowed CNs:

```sql
CREATE USER service_account
    IDENTIFIED WITH ssl_certificate CN 'etl-service',
    ssl_certificate CN 'etl-service-backup';
```

## Verifying Certificate Authentication in Logs

```sql
SELECT
    user,
    client_hostname,
    auth_type,
    event_time
FROM system.session_log
WHERE auth_type = 'SSL_CERTIFICATE'
ORDER BY event_time DESC
LIMIT 20;
```

## Certificate Rotation

To rotate a client certificate without disrupting service:

1. Generate a new certificate with the same CN
2. Add the new CN to the user definition temporarily (or issue under the same CN)
3. Update the client application to use the new certificate
4. Remove the old certificate from the user definition

```sql
-- Temporarily allow both old and new cert CNs
ALTER USER alice
    IDENTIFIED WITH ssl_certificate CN 'alice-2024',
    ssl_certificate CN 'alice-2025';

-- After cutover, remove old cert CN
ALTER USER alice
    IDENTIFIED WITH ssl_certificate CN 'alice-2025';
```

## Summary

SSL client certificate authentication in ClickHouse provides passwordless mTLS authentication suitable for service accounts and automated pipelines. Configure the server with a CA certificate and `verificationMode=strict`, generate client certificates signed by the same CA, and create ClickHouse users mapped to the certificate's Common Name. The result is a strong authentication mechanism that integrates cleanly with your existing PKI infrastructure.
