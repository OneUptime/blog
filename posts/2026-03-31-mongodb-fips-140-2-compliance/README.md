# How to Configure MongoDB for FIPS 140-2 Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Compliance, Encryption, Configuration

Description: Learn how to enable and verify FIPS 140-2 compliance in MongoDB Enterprise to meet federal and regulated industry security requirements.

---

## What Is FIPS 140-2 and Why It Matters for MongoDB

FIPS 140-2 (Federal Information Processing Standard) defines cryptographic module requirements for U.S. government systems and regulated industries like healthcare and finance. MongoDB Enterprise supports FIPS mode, which restricts the server to use only FIPS-validated cryptographic algorithms for TLS, authentication, and encryption at rest.

Running MongoDB in FIPS mode ensures that all cryptographic operations use approved algorithms (AES, SHA-2, RSA with appropriate key sizes), which is required for FedRAMP authorization, HIPAA technical safeguards, and DoD compliance frameworks.

## Prerequisites

FIPS 140-2 mode requires:
- MongoDB Enterprise 4.2 or later
- An OS with a FIPS-validated cryptographic module (OpenSSL-fips on Linux, Windows CNG on Windows Server)
- TLS/SSL configured with FIPS-compliant cipher suites

Verify your OS FIPS module is active:

```bash
cat /proc/sys/crypto/fips_enabled
# Should output: 1
```

On RHEL/CentOS, enable FIPS mode at the OS level first:

```bash
fips-mode-setup --enable
reboot
```

## Enabling FIPS Mode in MongoDB

Add the following to your `mongod.conf`:

```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/mongodb/server.pem
    CAFile: /etc/mongodb/ca.pem
    FIPSMode: true
  bindIp: 0.0.0.0
  port: 27017

security:
  javascriptEnabled: false
```

The `FIPSMode: true` flag instructs MongoDB to load only FIPS-validated cipher suites from the underlying OpenSSL FIPS module. Setting `javascriptEnabled: false` prevents execution of non-FIPS code paths through the JavaScript engine.

## Verifying FIPS Mode Is Active

After restarting `mongod`, check the server log for confirmation:

```bash
grep -i fips /var/log/mongodb/mongod.log
```

You should see output like:

```text
{"t":{"$date":"2024-01-15T10:00:00.000Z"},"s":"I","c":"CONTROL","id":20696,"ctx":"initandlisten","msg":"FIPS mode is active"}
```

You can also verify from the mongo shell:

```javascript
db.adminCommand({ getCmdLineOpts: 1 })
// Look for net.tls.FIPSMode: true in parsed section
```

## Configuring FIPS-Compliant TLS Cipher Suites

Even with FIPS mode enabled, verify that your TLS configuration explicitly excludes non-FIPS ciphers. Generate a FIPS-compliant certificate using OpenSSL in FIPS mode:

```bash
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt \
  -days 365 -nodes \
  -subj "/CN=mongodb-server/O=MyOrg" \
  -sha256
```

Test that the server only accepts FIPS-approved ciphers:

```bash
openssl s_client -connect localhost:27017 \
  -tls1_2 \
  -cipher "AES256-GCM-SHA384:AES128-GCM-SHA256" \
  -CAfile /etc/mongodb/ca.pem
```

## Authentication Considerations in FIPS Mode

SCRAM-SHA-256 is the recommended authentication mechanism in FIPS mode. SCRAM-SHA-1 uses SHA-1, which is not approved for new use in FIPS 140-2 contexts. Update your connection string:

```text
mongodb://user:password@host:27017/admin?authMechanism=SCRAM-SHA-256&tls=true
```

Disable legacy mechanisms in `mongod.conf`:

```yaml
security:
  authorization: enabled
  ldap:
    transportSecurity: tls
setParameter:
  authenticationMechanisms: SCRAM-SHA-256
```

## Monitoring FIPS Compliance with OneUptime

After enabling FIPS mode, integrate monitoring to detect any cryptographic errors or TLS handshake failures. OneUptime can monitor MongoDB availability and alert you when TLS negotiation fails due to cipher mismatch, which is often the first sign of a FIPS misconfiguration.

Configure a TCP monitor on port 27017 and set up alert policies that notify your on-call team immediately when the service becomes unreachable after configuration changes.

## Summary

Configuring MongoDB for FIPS 140-2 compliance requires enabling OS-level FIPS mode, setting `FIPSMode: true` in `mongod.conf`, using SCRAM-SHA-256 for authentication, and generating certificates with FIPS-approved algorithms. Always verify FIPS mode activation in the server logs and test cipher suite negotiation before deploying to production regulated environments.
