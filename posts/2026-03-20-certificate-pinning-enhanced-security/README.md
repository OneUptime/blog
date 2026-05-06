# How to Implement Certificate Pinning for Enhanced Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Security, TLS, Certificate Pinning, HTTPS, Mobile, Application Security

Description: Learn how certificate pinning works, when to use it, and how to implement it in applications to prevent man-in-the-middle attacks.

---

Certificate pinning associates a server with its specific TLS certificate or public key, causing the client to reject any certificate that doesn't match - even if it's signed by a trusted CA. This protects against compromised CAs or MITM attacks.

---

## How Certificate Pinning Works

Standard TLS validation:
1. Server presents certificate
2. Client verifies it's signed by a trusted CA
3. Client proceeds - any valid CA-signed cert is accepted

With certificate pinning:
1. Server presents certificate
2. Client checks if the certificate/public key matches a stored pin
3. Client rejects the connection if it doesn't match - even if CA-valid

---

## Types of Pinning

| Type               | Pins                          | Flexibility |
|--------------------|-------------------------------|-------------|
| Certificate pin    | Full certificate (DER/hash)   | Low         |
| Public key pin     | Subject Public Key Info (SPKI) | Medium     |
| CA pin             | Intermediate or root CA        | High        |

Public key pinning is the most practical - the pin survives certificate renewals as long as the key pair is preserved.

---

## Extract a Public Key Pin

```bash
# Get the SPKI hash for certificate pinning

openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
# Output: abc123xyz...= (your pin)
```

---

## Python Example

```python
import base64
import hashlib
import socket
import ssl
from cryptography import x509
from cryptography.hazmat.primitives import serialization

EXPECTED_PIN = "abc123xyz...="  # Your computed pin
HOSTNAME = "api.example.com"
PORT = 443

context = ssl.create_default_context()

with socket.create_connection((HOSTNAME, PORT), timeout=10) as sock:
    with context.wrap_socket(sock, server_hostname=HOSTNAME) as tls_sock:
        der_cert = tls_sock.getpeercert(binary_form=True)

cert = x509.load_der_x509_certificate(der_cert)
spki = cert.public_key().public_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)
actual_pin = base64.b64encode(hashlib.sha256(spki).digest()).decode("ascii")

if actual_pin != EXPECTED_PIN:
    raise ssl.SSLError(f"pin validation failed: expected {EXPECTED_PIN}, got {actual_pin}")
```

---

## Android Implementation (OkHttp)

```kotlin
val client = OkHttpClient.Builder()
    .certificatePinner(
        CertificatePinner.Builder()
            .add("api.example.com", "sha256/abc123xyz...=")
            .add("api.example.com", "sha256/backup-pin...=")  // Backup pin
            .build()
    )
    .build()
```

On Android, use pinning cautiously: Google notes that certificate pinning is not generally recommended because certificate or CA changes can break connectivity unless you keep backup pins and a rotation plan.

---

## HTTP Public Key Pinning (HPKP) Header - Deprecated

```text
# HPKP is deprecated, do not use in production
Public-Key-Pins: pin-sha256="abc123..."; max-age=5184000; includeSubDomains
```

HPKP was removed from browsers due to misuse risk. Use application-level pinning instead.

---

## Summary

Certificate pinning prevents MITM attacks by comparing a server's certificate or public key to a stored pin. Prefer pinning the public key (SPKI hash) rather than the full certificate when you want renewals to keep working with the same key pair. Include at least one backup pin for rotation. When used, pinning is most appropriate for clients and services you control end to end and can update quickly if certificate or CA changes are needed.
