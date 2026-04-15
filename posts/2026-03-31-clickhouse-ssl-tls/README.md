# How to Configure ClickHouse SSL/TLS for Secure Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Security, SSL, TLS, Configuration

Description: Learn how to enable SSL/TLS for ClickHouse HTTP and native TCP interfaces, configure certificates, and enforce encrypted connections for clients and inter-server communication.

---

By default ClickHouse communicates over plain text. For any production deployment that handles sensitive data or operates across untrusted networks, you should enable TLS on both the HTTP interface and the native TCP interface. ClickHouse uses OpenSSL for TLS and supports mutual TLS (mTLS) for additional security.

## Generating Certificates

For testing, generate a self-signed certificate:

```bash
# Create a directory for certificates
mkdir -p /etc/clickhouse-server/ssl

# Generate a private key and self-signed certificate
openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
    -keyout /etc/clickhouse-server/ssl/server.key \
    -out /etc/clickhouse-server/ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=MyOrg/CN=clickhouse.internal"

# Generate DH parameters for forward secrecy
openssl dhparam -out /etc/clickhouse-server/ssl/dhparam.pem 2048

# Set correct permissions
chmod 640 /etc/clickhouse-server/ssl/server.key
chown clickhouse:clickhouse /etc/clickhouse-server/ssl/server.key
```

For production, use a certificate signed by your internal CA or a public CA like Let's Encrypt.

## Configuring the OpenSSL Context

Add the `<openssl>` section to `/etc/clickhouse-server/config.xml` or a drop-in file in `/etc/clickhouse-server/config.d/`:

```xml
<clickhouse>
    <openssl>
        <server>
            <!-- Path to the server certificate (PEM format) -->
            <certificateFile>/etc/clickhouse-server/ssl/server.crt</certificateFile>

            <!-- Path to the server private key -->
            <privateKeyFile>/etc/clickhouse-server/ssl/server.key</privateKeyFile>

            <!-- Diffie-Hellman parameters for forward secrecy -->
            <dhParamsFile>/etc/clickhouse-server/ssl/dhparam.pem</dhParamsFile>

            <!-- How to verify client certificates:
                 none     = no client certificate required (most common)
                 relaxed  = request client cert but accept connections without one
                 strict   = require and validate client certificate (mTLS) -->
            <verificationMode>none</verificationMode>

            <!-- Load the system CA bundle for verifying upstream connections -->
            <loadDefaultCAFile>true</loadDefaultCAFile>

            <!-- Enable TLS session caching -->
            <cacheSessions>true</cacheSessions>

            <!-- Disable old, insecure protocol versions -->
            <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>

            <!-- Prefer the server's cipher order over the client's -->
            <preferServerCiphers>true</preferServerCiphers>
        </server>

        <client>
            <!-- Settings for outbound TLS connections (e.g., replication, external dictionaries) -->
            <loadDefaultCAFile>true</loadDefaultCAFile>
            <cacheSessions>true</cacheSessions>
            <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>
            <preferServerCiphers>true</preferServerCiphers>
            <!-- For self-signed certs on remote hosts: set to false during testing only -->
            <verificationMode>strict</verificationMode>
            <invalidCertificateHandler>
                <name>RejectCertificateHandler</name>
            </invalidCertificateHandler>
        </client>
    </openssl>
</clickhouse>
```

## Enabling HTTPS

Add the `<https_port>` setting alongside the OpenSSL config:

```xml
<clickhouse>
    <https_port>8443</https_port>

    <!-- Optionally disable plain HTTP to enforce encryption -->
    <!-- <http_port>8123</http_port> -->
</clickhouse>
```

Test the HTTPS interface:

```bash
# With a trusted certificate
curl "https://clickhouse.internal:8443/?query=SELECT+1"

# With a self-signed certificate (skip verification during testing only)
curl -k "https://localhost:8443/?query=SELECT+1"
```

## Enabling Native TCP with TLS

```xml
<clickhouse>
    <tcp_port_secure>9440</tcp_port_secure>

    <!-- Optionally disable plain TCP -->
    <!-- <tcp_port>9000</tcp_port> -->
</clickhouse>
```

Connect with `clickhouse-client` using TLS:

```bash
clickhouse-client \
    --host clickhouse.internal \
    --port 9440 \
    --secure \
    --query "SELECT 1"
```

For self-signed certificates, pass `--accept-invalid-certificate`:

```bash
clickhouse-client \
    --host localhost \
    --port 9440 \
    --secure \
    --accept-invalid-certificate \
    --query "SELECT version()"
```

## Mutual TLS (mTLS) - Requiring Client Certificates

mTLS requires every client to present a certificate signed by a trusted CA. This is useful for machine-to-machine connections where you want to verify client identity, not just encrypt traffic.

```xml
<clickhouse>
    <openssl>
        <server>
            <certificateFile>/etc/clickhouse-server/ssl/server.crt</certificateFile>
            <privateKeyFile>/etc/clickhouse-server/ssl/server.key</privateKeyFile>
            <caConfig>/etc/clickhouse-server/ssl/ca-chain.crt</caConfig>

            <!-- strict: client must present a valid certificate -->
            <verificationMode>strict</verificationMode>

            <loadDefaultCAFile>false</loadDefaultCAFile>
            <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>
        </server>
    </openssl>
</clickhouse>
```

Connecting with a client certificate requires configuring the client's OpenSSL settings. Create or edit the client config file at `/etc/clickhouse-client/config.xml`:

```xml
<config>
    <openSSL>
        <client>
            <certificateFile>/path/to/client.crt</certificateFile>
            <privateKeyFile>/path/to/client.key</privateKeyFile>
            <caConfig>/path/to/ca.crt</caConfig>
        </client>
    </openSSL>
</config>
```

Then connect normally with TLS enabled:

```bash
clickhouse-client \
    --host clickhouse.internal \
    --port 9440 \
    --secure \
    --query "SELECT 1"
```

## Securing Interserver Replication Traffic

Inter-server HTTP traffic (replication, fetching parts) can also be secured:

```xml
<clickhouse>
    <!-- Enable TLS for inter-server HTTP -->
    <interserver_https_port>9010</interserver_https_port>
    <!-- Disable plain inter-server HTTP -->
    <!-- <interserver_http_port>9009</interserver_http_port> -->

    <interserver_http_credentials>
        <user>interserver</user>
        <password>inter_secret</password>
    </interserver_http_credentials>
</clickhouse>
```

## Configuring TLS for External Dictionaries and S3

If your ClickHouse connects to HTTPS endpoints for external dictionaries or S3-compatible storage, the `<client>` section of the OpenSSL config controls certificate verification for those connections:

```xml
<clickhouse>
    <openssl>
        <client>
            <caConfig>/etc/ssl/certs/ca-certificates.crt</caConfig>
            <verificationMode>strict</verificationMode>
            <invalidCertificateHandler>
                <name>RejectCertificateHandler</name>
            </invalidCertificateHandler>
        </client>
    </openssl>
</clickhouse>
```

## Verifying TLS Configuration

```bash
# Check TLS handshake details with openssl s_client
openssl s_client -connect clickhouse.internal:8443 -servername clickhouse.internal

# Check which TLS version and cipher were negotiated
openssl s_client -connect clickhouse.internal:9440 \
    -tls1_2 \
    -brief 2>/dev/null
```

Check ClickHouse logs for TLS errors:

```bash
journalctl -u clickhouse-server -n 100 | grep -i ssl
# Or:
tail -n 100 /var/log/clickhouse-server/clickhouse-server.err.log | grep -i ssl
```

## Certificate Rotation Without Downtime

ClickHouse reloads its certificate on SIGHUP without dropping connections:

```bash
# Place new certificate and key files in the configured paths, then:
sudo kill -HUP $(pidof clickhouse-server)
# Verify the new certificate is in use:
openssl s_client -connect localhost:8443 -brief 2>/dev/null | grep subject
```

## Complete TLS Configuration Example

```xml
<clickhouse>
    <!-- Ports -->
    <https_port>8443</https_port>
    <tcp_port_secure>9440</tcp_port_secure>
    <interserver_https_port>9010</interserver_https_port>

    <!-- Disable plain-text ports in production -->
    <!-- <http_port>8123</http_port> -->
    <!-- <tcp_port>9000</tcp_port> -->
    <!-- <interserver_http_port>9009</interserver_http_port> -->

    <openssl>
        <server>
            <certificateFile>/etc/clickhouse-server/ssl/server.crt</certificateFile>
            <privateKeyFile>/etc/clickhouse-server/ssl/server.key</privateKeyFile>
            <dhParamsFile>/etc/clickhouse-server/ssl/dhparam.pem</dhParamsFile>
            <verificationMode>none</verificationMode>
            <loadDefaultCAFile>true</loadDefaultCAFile>
            <cacheSessions>true</cacheSessions>
            <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>
            <preferServerCiphers>true</preferServerCiphers>
        </server>
        <client>
            <loadDefaultCAFile>true</loadDefaultCAFile>
            <cacheSessions>true</cacheSessions>
            <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>
            <verificationMode>strict</verificationMode>
            <invalidCertificateHandler>
                <name>RejectCertificateHandler</name>
            </invalidCertificateHandler>
        </client>
    </openssl>
</clickhouse>
```

## Conclusion

Enabling TLS in ClickHouse requires three things: a valid certificate and private key, an `<openssl>` block referencing those files, and the TLS port settings (`https_port`, `tcp_port_secure`). Disable plain-text ports in production once all clients have been migrated to encrypted connections. Use mTLS when you need to authenticate clients by certificate, and enable `<interserver_https_port>` to encrypt replication traffic between cluster nodes.
