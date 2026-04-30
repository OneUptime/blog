# How to Fix TLS Version Mismatch Between Client and Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, SSL, TLS Version, Compatibility, OpenSSL, Nginx, Apache, Troubleshooting

Description: Learn how to diagnose and fix TLS version mismatch errors between clients and servers, including identifying supported versions, configuring acceptable ranges, and testing with OpenSSL.

---

A TLS version mismatch occurs when a client and server cannot agree on a common protocol version. The connection fails with errors like `SSL_ERROR_NO_CYPHER_OVERLAP` or `unsupported protocol`.

## Diagnosing the Mismatch

```bash
# Test which TLS versions a server supports

openssl s_client -connect example.com:443 -tls1_2 2>&1 | grep -E "Protocol|error"
openssl s_client -connect example.com:443 -tls1_3 2>&1 | grep -E "Protocol|error"

# Full TLS version scan with sslscan
sslscan example.com

# Verbose curl (OpenSSL builds often show the negotiated version)
curl -v https://example.com 2>&1 | grep "SSL connection using"
# Example output on OpenSSL builds: * SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
```

## Common Error Messages and Causes

| Error | Cause |
|-------|-------|
| `unsupported protocol` | Server max version is below client min version |
| `no shared cipher` | No common cipher suites |
| `WRONG_VERSION_NUMBER` | Client sent TLS to a plain-TCP port |
| `tlsv1 alert protocol version` | Client tried TLS 1.0/1.1 but server requires 1.2+ |

## Fix on Nginx

```nginx
# Allow TLSv1.2 and TLSv1.3 only
ssl_protocols TLSv1.2 TLSv1.3;

# If you need to support older clients (not recommended):
ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;

# Verify and reload
nginx -t && nginx -s reload
```

## Fix on Apache

```apache
# /etc/apache2/mods-available/ssl.conf
SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
# Equivalent: enable TLSv1.2 and TLSv1.3 only

# For legacy client support:
SSLProtocol all -SSLv3

# Reload
apachectl configtest && apachectl graceful
```

## Fix on HAProxy

```haproxy
global
    ssl-default-bind-options ssl-min-ver TLSv1.2

frontend https
    bind *:443 ssl crt /etc/ssl/certs/site.pem ssl-min-ver TLSv1.2

backend app
    server web1 10.0.0.10:443 ssl ssl-min-ver TLSv1.2 verify none
```

## Fix on the Client Side (curl)

```bash
# Force TLS 1.2 on the client
curl --tlsv1.2 --tls-max 1.2 https://example.com

# Force TLS 1.3
curl --tlsv1.3 https://example.com

# Test against old server that only supports TLS 1.0 (dangerous)
curl --tlsv1.0 --tls-max 1.0 https://legacy.example.com
```

## Fix on Java Clients (JVM)

```bash
# Inspect TLS handshake debug output
java -Djavax.net.debug=ssl:handshake -jar TestSSL.jar

# Enable TLS 1.2 in Java 7 clients (supported, but not enabled by default)
# In code: SSLContext.getInstance("TLSv1.2")
# Or set system property for HttpsURLConnection:
java -Dhttps.protocols=TLSv1.2 -jar TestSSL.jar

# On JDK 8+ JSSE clients:
java -Djdk.tls.client.protocols=TLSv1.2,TLSv1.3 -jar TestSSL.jar
```

## OpenSSL System-Wide Configuration

```bash
# /etc/ssl/openssl.cnf - set minimum TLS version system-wide
openssl_conf = openssl_init

[openssl_init]
ssl_conf = ssl_configuration

[ssl_configuration]
system_default = tls_system_default

[tls_system_default]
MinProtocol = TLSv1.2
CipherString = DEFAULT@SECLEVEL=2
```

## Key Takeaways

- Use `openssl s_client` with `-tls1_2` or `-tls1_3` flags to test which versions a server accepts.
- On Nginx, set `ssl_protocols TLSv1.2 TLSv1.3`; on Apache, use `SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1`.
- Avoid enabling TLS 1.0 or 1.1 unless required by legacy clients; both are deprecated.
- For Java clients, use `-Dhttps.protocols=TLSv1.2` for older `HttpsURLConnection` clients, or `-Djdk.tls.client.protocols=TLSv1.2,TLSv1.3` on JDK 8+ JSSE clients.
