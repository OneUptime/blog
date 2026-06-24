# How to Configure Certificate Pinning for Enhanced Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Certificate Pinning, TLS, HPKP, Security, HTTPS, Mobile Security, API Security

Description: Learn how to implement certificate pinning in mobile apps, HTTP clients, and APIs to prevent man-in-the-middle attacks by binding connections to specific certificates or public keys.

---

Certificate pinning binds a client to a specific certificate or public key, rejecting connections even if a valid CA-signed certificate is presented by an impostor. Because pinning is operationally brittle, use it only when you control both client and server and can safely rotate pins.

## How Certificate Pinning Works

```text
Without pinning:
  Client → trusts any certificate signed by a known CA → MITM possible with rogue CA

With pinning:
  Client → compares server cert/public key to stored pin → rejects if no match
```

## Extracting a Public Key Pin

```bash
# Extract the leaf certificate's public key pin (SPKI SHA-256, base64)

openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64

# Output (example):
# AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```

## Certificate Pinning in curl

```bash
# Pin using a SHA-256 hash of the server's public key
curl --pinnedpubkey "sha256//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" \
     https://api.example.com

# Pin using a PEM or DER public key file
curl --pinnedpubkey /etc/ssl/certs/api-pubkey.pem https://api.example.com
```

## Certificate Pinning in Python

```python
import urllib3

# Pin a specific certificate fingerprint (SHA-256, hex)
http = urllib3.HTTPSConnectionPool(
    "api.example.com",
    443,
    assert_fingerprint=(
        "0123456789abcdef0123456789abcdef"
        "0123456789abcdef0123456789abcdef"
    ),
)

response = http.request("GET", "/")
```

## Certificate Pinning in Go

```go
package main

import (
    "crypto/sha256"
    "crypto/tls"
    "crypto/x509"
    "encoding/base64"
    "fmt"
    "net/http"
)

var pinnedKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

func main() {
    tlsConfig := &tls.Config{
        VerifyConnection: func(cs tls.ConnectionState) error {
            if len(cs.PeerCertificates) == 0 {
                return fmt.Errorf("no server certificate presented")
            }
            for _, cert := range cs.PeerCertificates {
                pubKeyDer, err := x509.MarshalPKIXPublicKey(cert.PublicKey)
                if err != nil {
                    return err
                }
                hash := sha256.Sum256(pubKeyDer)
                pin := base64.StdEncoding.EncodeToString(hash[:])
                if pin == pinnedKey {
                    return nil
                }
            }
            return fmt.Errorf("certificate pin mismatch")
        },
    }

    client := &http.Client{
        Transport: &http.Transport{TLSClientConfig: tlsConfig},
    }
    resp, err := client.Get("https://api.example.com")
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
}
```

## Certificate Pinning in Android (OkHttp)

```kotlin
val client = OkHttpClient.Builder()
    .certificatePinner(
        CertificatePinner.Builder()
            .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
            .add("api.example.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")  // Always include a backup pin
            .build()
    )
    .build()
```

## Best Practices

| Practice | Why |
|----------|-----|
| Prefer pinning the public key (SPKI hash) when you need renewal flexibility | Survives cert renewal with same key pair |
| Always include a backup pin | Allows key rotation without app update |
| Set an expiry date for pins | Prevents lockout if pin becomes outdated |
| Monitor for pin failures | Detect MITM attempts in production |

## Key Takeaways

- Prefer pinning the public key (SPKI hash) rather than the full certificate when you need renewal flexibility.
- Always configure a backup pin to allow key rotation without breaking clients.
- Use certificate pinning only when you control both client and server and can safely manage rotations for high-value endpoints.
- Test pinning in staging before production - a misconfigured pin breaks all client connectivity.
