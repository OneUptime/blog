# How to Configure cert-manager Certificate Private Key Algorithm and Key Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to configure cert-manager certificate private key algorithms, key sizes, and encoding formats for optimal security and performance in Kubernetes environments.

---

Private key configuration directly impacts certificate security and performance. Different algorithms (RSA, ECDSA, Ed25519) offer different tradeoffs between security strength, computational overhead, and compatibility. Key size affects both security level and processing performance. cert-manager provides flexible private key configuration to meet diverse security and operational requirements.

This guide covers configuring private key algorithms, choosing appropriate key sizes, implementing key rotation policies, and understanding the security and performance implications of different choices.

## Understanding Private Key Algorithms

cert-manager supports three main private key algorithms:

RSA (Rivest-Shamir-Adleman): The most widely supported algorithm with established security properties. Larger key sizes required for equivalent security to ECDSA.

ECDSA (Elliptic Curve Digital Signature Algorithm): Provides equivalent security to RSA with smaller key sizes, resulting in better performance and smaller certificates.

Ed25519: Modern elliptic curve algorithm offering excellent security and performance with fixed key size (256 bits). Limited compatibility with older systems.

## Configuring RSA Keys

RSA is the default and most compatible option:

```yaml
# rsa-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: rsa-cert
  namespace: production
spec:
  secretName: rsa-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer

  dnsNames:
  - app.example.com

  # RSA private key configuration
  privateKey:
    algorithm: RSA
    # Key size in bits
    # Options: 2048, 3072, 4096
    size: 2048

    # Encoding format
    # Options: PKCS1, PKCS8 (default)
    encoding: PKCS8

    # Rotation policy
    # Options: Never, Always
    rotationPolicy: Always
```

RSA key size recommendations:
- 2048 bits: Standard security level, widely accepted, good performance
- 3072 bits: Enhanced security, moderate performance impact
- 4096 bits: High security, significant performance overhead

Most environments use 2048-bit RSA keys as they provide adequate security with good performance.

## Configuring ECDSA Keys

ECDSA provides equivalent security with smaller key sizes:

```yaml
# ecdsa-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ecdsa-cert
  namespace: production
spec:
  secretName: ecdsa-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer

  dnsNames:
  - api.example.com

  # ECDSA private key configuration
  privateKey:
    algorithm: ECDSA
    # Key size in bits
    # Options: 256 (P-256), 384 (P-384), 521 (P-521)
    size: 256

    encoding: PKCS8
    rotationPolicy: Always
```

ECDSA key size recommendations:
- 256 bits (P-256): Equivalent to 3072-bit RSA, excellent performance
- 384 bits (P-384): Equivalent to 7680-bit RSA, enhanced security
- 521 bits (P-521): Highest security level, minimal performance impact

P-256 (256-bit ECDSA) provides security equivalent to 3072-bit RSA while being significantly faster.

## Configuring Ed25519 Keys

Ed25519 offers modern security with fixed key size:

```yaml
# ed25519-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ed25519-cert
  namespace: production
spec:
  secretName: ed25519-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer

  dnsNames:
  - modern-app.example.com

  # Ed25519 private key configuration
  privateKey:
    algorithm: Ed25519
    # No size parameter - Ed25519 uses fixed 256-bit keys

    encoding: PKCS8
    rotationPolicy: Always
```

Ed25519 benefits:
- Fixed 256-bit key size
- Excellent performance (faster than ECDSA and RSA)
- Strong security properties
- Smaller signatures than ECDSA or RSA

Limitations:
- Limited compatibility with older TLS libraries
- Not supported by all certificate authorities
- May require modern client software

## Algorithm Comparison

Performance and security comparison:

```yaml
# algorithm-comparison-certs.yaml
---
# RSA 2048: Baseline
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: rsa-2048-cert
spec:
  secretName: rsa-2048-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - rsa2048.example.com
  privateKey:
    algorithm: RSA
    size: 2048
---
# RSA 4096: Higher security, slower
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: rsa-4096-cert
spec:
  secretName: rsa-4096-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - rsa4096.example.com
  privateKey:
    algorithm: RSA
    size: 4096
---
# ECDSA P-256: Best overall balance
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ecdsa-256-cert
spec:
  secretName: ecdsa-256-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - ecdsa256.example.com
  privateKey:
    algorithm: ECDSA
    size: 256
---
# Ed25519: Modern choice
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ed25519-cert
spec:
  secretName: ed25519-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - ed25519.example.com
  privateKey:
    algorithm: Ed25519
```

Performance characteristics (approximate):
- RSA 2048: 1x baseline
- RSA 4096: 7x slower than RSA 2048
- ECDSA P-256: 10x faster than RSA 2048
- Ed25519: 20x faster than RSA 2048

## Encoding Format Selection

Private keys can be encoded in different formats:

```yaml
# encoding-formats.yaml
---
# PKCS8 encoding (default, recommended)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: pkcs8-cert
spec:
  secretName: pkcs8-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - pkcs8.example.com
  privateKey:
    algorithm: RSA
    size: 2048
    encoding: PKCS8 # Standard format, broad compatibility
---
# PKCS1 encoding (legacy, RSA only)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: pkcs1-cert
spec:
  secretName: pkcs1-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - pkcs1.example.com
  privateKey:
    algorithm: RSA
    size: 2048
    encoding: PKCS1 # Legacy format, RSA only
```

PKCS8 is recommended for new deployments. PKCS1 may be required for compatibility with very old systems that don't support PKCS8.

## Environment-Specific Configurations

Different environments may require different key configurations:

```yaml
# environment-specific-keys.yaml
---
# Development: Fast key generation
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dev-cert
  namespace: development
spec:
  secretName: dev-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - app.dev.example.com
  privateKey:
    algorithm: ECDSA
    size: 256 # Fast generation for development
    rotationPolicy: Always
---
# Production: Security focused
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: prod-cert
  namespace: production
spec:
  secretName: prod-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
  privateKey:
    algorithm: RSA
    size: 2048 # Broad compatibility
    rotationPolicy: Always
---
# High security: Enhanced protection
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: secure-cert
  namespace: high-security
spec:
  secretName: secure-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - secure.example.com
  privateKey:
    algorithm: ECDSA
    size: 384 # Enhanced security
    rotationPolicy: Always
```

## Compatibility Considerations

Different algorithms have different compatibility profiles:

### RSA Compatibility

```yaml
# Maximum compatibility certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: universal-compat-cert
spec:
  secretName: universal-compat-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - legacy.example.com
  privateKey:
    algorithm: RSA
    size: 2048
    encoding: PKCS8
```

RSA 2048 works with:
- All modern browsers and TLS libraries
- Legacy systems from early 2000s
- Embedded devices and IoT platforms
- All major certificate authorities

### ECDSA Compatibility

```yaml
# Modern systems certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: modern-compat-cert
spec:
  secretName: modern-compat-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - modern.example.com
  privateKey:
    algorithm: ECDSA
    size: 256
```

ECDSA P-256 works with:
- All modern browsers (post-2015)
- Recent TLS library versions
- Most certificate authorities
- May have issues with very old clients

### Ed25519 Compatibility

```yaml
# Cutting-edge systems certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cutting-edge-cert
spec:
  secretName: cutting-edge-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - latest.example.com
  privateKey:
    algorithm: Ed25519
```

Ed25519 works with:
- Latest browsers (Chrome 90+, Firefox 92+)
- Recent OpenSSL versions (1.1.1+)
- Modern programming language TLS libraries
- Limited certificate authority support

## Security Recommendations

### Minimum Key Sizes

Current security best practices (2026):
- RSA: 2048 bits minimum, 3072 bits for high security
- ECDSA: 256 bits minimum, 384 bits for high security
- Ed25519: 256 bits (fixed)

Avoid using:
- RSA 1024: Considered weak, can be broken
- RSA < 2048: Insufficient security margin

### Algorithm Selection Matrix

```yaml
# selection-matrix.yaml
---
# Internet-facing services (broad compatibility required)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internet-facing
spec:
  secretName: internet-facing-tls
  privateKey:
    algorithm: RSA
    size: 2048
---
# API services (performance important, modern clients)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-service
spec:
  secretName: api-service-tls
  privateKey:
    algorithm: ECDSA
    size: 256
---
# Internal microservices (performance critical)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-service
spec:
  secretName: internal-service-tls
  privateKey:
    algorithm: Ed25519
---
# High security applications
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: high-security
spec:
  secretName: high-security-tls
  privateKey:
    algorithm: ECDSA
    size: 384
```

## Performance Testing

Test algorithm performance in your environment:

```bash
# Generate RSA 2048 key
time openssl genrsa 2048

# Generate RSA 4096 key
time openssl genrsa 4096

# Generate ECDSA P-256 key
time openssl ecparam -genkey -name prime256v1 -out ecdsa256.key

# Generate Ed25519 key
time openssl genpkey -algorithm ed25519 -out ed25519.key

# Compare TLS handshake performance
# Use tools like apache bench or wrk
```

## Migrating Between Algorithms

Migrate from RSA to ECDSA for better performance:

```yaml
# migration-example.yaml
---
# Phase 1: Current RSA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert
  annotations:
    migration-phase: "current"
spec:
  secretName: app-tls
  privateKey:
    algorithm: RSA
    size: 2048
---
# Phase 2: New ECDSA certificate (blue-green deployment)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert-new
  annotations:
    migration-phase: "new"
spec:
  secretName: app-tls-new
  privateKey:
    algorithm: ECDSA
    size: 256
```

Test with the new certificate, then switch when ready.

## Monitoring Key Types

Track certificate key types across your cluster:

```bash
# List certificates by key algorithm
kubectl get certificates --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name): \(.spec.privateKey.algorithm) \(.spec.privateKey.size)"'

# Count certificates by algorithm
kubectl get certificates --all-namespaces -o json | \
  jq -r '.items[].spec.privateKey.algorithm' | sort | uniq -c
```

## Best Practices

Use ECDSA P-256 for new certificates unless compatibility concerns require RSA. It provides better performance with equivalent security.

Avoid RSA 4096 unless regulations mandate it. The performance cost rarely justifies the marginal security improvement over RSA 2048.

Use Ed25519 for internal services where you control both endpoints. The performance benefits are significant.

Implement key rotation by setting rotationPolicy: Always. This limits key exposure if compromised.

Test algorithm compatibility with your client base before production deployment.

Document your key algorithm choices. Future teams need to understand the rationale.

## Conclusion

Private key algorithm and size configuration significantly impacts both security and performance. Understanding the tradeoffs enables informed decisions matching your security requirements and operational constraints.

For most use cases, ECDSA P-256 provides the best balance of security, performance, and compatibility. RSA 2048 remains appropriate for maximum compatibility, while Ed25519 offers cutting-edge performance for modern environments. Select based on your specific requirements, client compatibility, and performance needs.
