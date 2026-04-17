# How to Implement Certificate Pinning for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TLS, Certificate Pinning, Security, Encryption

Description: Implement certificate pinning for ClickHouse clients to prevent man-in-the-middle attacks by validating the server's TLS certificate fingerprint on every connection.

---

Certificate pinning adds an extra layer of TLS security by requiring the client to validate not just that the server certificate is trusted, but that it matches a specific expected certificate or CA. This prevents attacks where a compromised CA issues a fraudulent certificate for your ClickHouse server.

## Understanding Certificate Pinning Options

There are two levels of pinning:
- **Certificate pinning**: Pin to the exact server certificate (breaks on renewal)
- **CA pinning**: Pin to your internal CA certificate (safer for production)

For ClickHouse deployments, CA pinning with your internal CA is the recommended approach - it survives certificate rotation while still preventing attacks from other CAs.

## Configuring Server-Side TLS

Set up the ClickHouse server with your internal CA:

```xml
<openSSL>
  <server>
    <certificateFile>/etc/clickhouse-server/ssl/server.crt</certificateFile>
    <privateKeyFile>/etc/clickhouse-server/ssl/server.key</privateKeyFile>
    <caConfig>/etc/clickhouse-server/ssl/internal-ca.crt</caConfig>
    <verificationMode>strict</verificationMode>
    <disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>
    <cipherList>TLSv1.3:HIGH:!aNULL:!MD5</cipherList>
  </server>
</openSSL>
```

## Client-Side Certificate Pinning

Configure the ClickHouse native client to pin to the internal CA:

```xml
<!-- ~/.clickhouse-client/config.xml -->
<config>
  <openSSL>
    <client>
      <caConfig>/etc/ssl/certs/internal-ca.crt</caConfig>
      <verificationMode>strict</verificationMode>
      <invalidCertificateHandler>
        <name>RejectCertificateHandler</name>
      </invalidCertificateHandler>
    </client>
  </openSSL>
</config>
```

## Extracting and Pinning the Certificate Fingerprint

Get the fingerprint of the server's current certificate:

```bash
openssl x509 -in /etc/clickhouse-server/ssl/server.crt \
    -noout -fingerprint -sha256
```

Example output:

```text
SHA256 Fingerprint=AB:12:CD:34:EF:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78
```

## Pinning in Application Code

For application-level pinning in Python:

```python
import ssl
import clickhouse_connect

# Create SSL context with pinned CA
ssl_context = ssl.create_default_context(
    cafile='/etc/ssl/certs/internal-ca.crt'
)
ssl_context.verify_mode = ssl.CERT_REQUIRED
ssl_context.check_hostname = True

client = clickhouse_connect.get_client(
    host='clickhouse.internal',
    port=8443,
    secure=True,
    verify=True,
    ca_cert='/etc/ssl/certs/internal-ca.crt'
)
```

For Go applications using the ClickHouse driver:

```go
config := &clickhouse.Options{
    Addr: []string{"clickhouse.internal:9440"},
    TLS: &tls.Config{
        ServerName: "clickhouse.internal",
        RootCAs:    loadCACert("/etc/ssl/certs/internal-ca.crt"),
        MinVersion: tls.VersionTLS12,
    },
}
```

## Certificate Rotation Without Breaking Pinning

When using CA pinning, rotate the server certificate without changing the CA:

```bash
# Generate new server cert signed by the same internal CA
openssl req -new -key server.key -out server.csr \
    -subj "/CN=clickhouse.internal/O=MyOrg"

openssl x509 -req -in server.csr \
    -CA internal-ca.crt -CAkey internal-ca.key \
    -CAcreateserial -out new-server.crt -days 365

# Replace the certificate file
cp new-server.crt /etc/clickhouse-server/ssl/server.crt
systemctl reload clickhouse-server
```

Because clients are pinned to the CA, they continue working without reconfiguration.

## Verifying Pinning is Working

Test that a connection using an untrusted certificate fails:

```bash
# Should fail - client config points to a different (untrusted) CA
clickhouse-client --config-file /etc/clickhouse-client/untrusted-ca-config.xml \
    --host clickhouse.internal --port 9440 --secure \
    --query "SELECT 1"
# Expected: SSL verification error
```

## Summary

Certificate pinning for ClickHouse protects against man-in-the-middle attacks by requiring clients to validate the server certificate against a pinned CA or fingerprint. Use CA pinning rather than leaf-certificate pinning for production to simplify certificate rotation. Enforce `verificationMode strict` on both client and server configurations, and test that connections using unauthorized certificates are correctly rejected.
