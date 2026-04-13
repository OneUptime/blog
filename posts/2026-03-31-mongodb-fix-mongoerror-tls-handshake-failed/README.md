# How to Fix MongoError: TLS Handshake Failed in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TLS, SSL, Certificate, Security

Description: Learn why MongoDB TLS handshake failures occur and how to fix them by configuring certificates, CA bundles, hostname verification, and TLS version settings.

---

## Understanding the Error

`MongoError: TLS handshake failed` or `SSL routines: certificate verify failed` means the TLS negotiation between the MongoDB client and server did not complete successfully. This prevents the encrypted connection from being established.

```text
MongoServerSelectionError: SSL routines::certificate verify failed
MongoNetworkError: TLS handshake failed: unable to verify the first certificate
```

## Cause 1: Certificate Authority Not Trusted

The client does not trust the CA that signed the server's certificate. For self-signed or internal CA certificates:

```javascript
// Node.js - provide the CA certificate
const client = new MongoClient(uri, {
  tls: true,
  tlsCAFile: '/path/to/ca.pem'
});
```

```python
# Python - provide the CA bundle
client = MongoClient(uri, tlsCAFile='/path/to/ca.pem')
```

For Atlas and other public CAs, ensure the system's CA bundle is up to date:

```bash
# Ubuntu/Debian
sudo apt-get install --reinstall ca-certificates
sudo update-ca-certificates

# RHEL/CentOS
sudo update-ca-trust
```

## Cause 2: Hostname Mismatch

The server certificate was issued for a different hostname than the one in the connection string:

```text
MongoServerSelectionError: SSL: hostname verification failed
```

Check the certificate's Subject Alternative Names (SANs):

```bash
openssl s_client -connect myhost:27017 -servername myhost 2>/dev/null | \
  openssl x509 -noout -text | grep -A2 "Subject Alternative Name"
```

If the SAN does not include the hostname you are connecting to, either:
- Reissue the certificate with the correct hostname
- Use the correct hostname in your connection string

Temporarily disable hostname verification (development only - not for production):

```javascript
const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidHostnames: true // DEVELOPMENT ONLY
});
```

## Cause 3: Expired Certificate

```bash
# Check certificate expiry
openssl s_client -connect myhost:27017 2>/dev/null | \
  openssl x509 -noout -dates
```

Renew the certificate on the server and update `mongod.conf`:

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongodb/server-new.pem
    CAFile: /etc/ssl/mongodb/ca.pem
```

Restart mongod after updating the certificate.

## Cause 4: TLS Version Mismatch

MongoDB 4.2+ deprecated TLS 1.0 and 1.1, and MongoDB 6.0+ effectively requires TLS 1.2 or higher. If the client or server is configured to use an older version:

```yaml
# mongod.conf - disable old TLS versions
net:
  tls:
    mode: requireTLS
    disabledProtocols: TLS1_0,TLS1_1
```

```javascript
// Node.js client - ensure TLS 1.2+ at the runtime level
import tls from 'tls';
tls.DEFAULT_MIN_VERSION = 'TLSv1.2';

const client = new MongoClient(uri, {
  tls: true
});
```

## Cause 5: Client Certificate Required (mTLS)

If the server requires client certificates (`requireTLS` with `clusterAuthMode: x509`):

```javascript
// Provide client certificate and key
const client = new MongoClient(uri, {
  tls: true,
  tlsCertificateKeyFile: '/etc/ssl/mongodb/client.pem',
  tlsCAFile: '/etc/ssl/mongodb/ca.pem'
});
```

## Debugging TLS Issues

```bash
# Verbose TLS debug output
openssl s_client -connect myhost:27017 \
  -CAfile /path/to/ca.pem \
  -servername myhost \
  -debug 2>&1 | head -100
```

## Summary

MongoDB TLS handshake failures are caused by untrusted CAs, hostname mismatches, expired certificates, TLS version incompatibilities, or missing client certificates. Fix them by providing the correct CA bundle to the client, ensuring certificate SANs match the hostname, renewing expired certificates, and configuring TLS 1.2+ on both client and server.
