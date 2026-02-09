# How to Use cert-manager ACME External Account Binding for Enterprise Let's Encrypt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to configure cert-manager with ACME External Account Binding (EAB) for enterprise Let's Encrypt accounts and other ACME providers requiring account registration.

---

External Account Binding (EAB) is an ACME protocol feature that links ACME accounts with external account systems. Enterprise Let's Encrypt deployments, ZeroSSL, and other commercial ACME providers require EAB for account validation. This ensures only authorized organizations can request certificates from their ACME endpoints.

cert-manager supports EAB, enabling integration with enterprise ACME services while maintaining automated certificate management. This guide shows how to configure EAB for various ACME providers and manage enterprise certificate issuance.

## Understanding External Account Binding

EAB provides a cryptographic binding between an ACME account and an external account identifier. During ACME account registration, the client proves possession of credentials (Key ID and HMAC key) provided by the certificate authority.

This authentication mechanism enables:
- Enterprise control over who can request certificates
- Integration with existing customer account systems
- Billing and quota management for certificate issuance
- Compliance with organizational policies

## Obtaining EAB Credentials

Different ACME providers have different processes for obtaining EAB credentials:

### ZeroSSL

```bash
# Register for ZeroSSL account at zerossl.com
# Navigate to Developer section
# Generate EAB credentials
# You'll receive:
# - Key ID: unique identifier for your account
# - HMAC Key: base64-encoded secret key
```

### Enterprise Let's Encrypt

Enterprise customers receive EAB credentials through their Let's Encrypt enterprise account manager or portal.

### Other ACME Providers

Check provider documentation for EAB credential generation process. Most commercial ACME services provide credentials through web portals or API endpoints.

## Configuring EAB in cert-manager

Create a secret with EAB credentials:

```bash
# Create secret with EAB credentials
kubectl create secret generic zerossl-eab \
  --from-literal=key-id='YOUR_KEY_ID' \
  --from-literal=hmac-key='YOUR_BASE64_HMAC_KEY' \
  -n cert-manager
```

Configure ClusterIssuer with EAB:

```yaml
# zerossl-issuer-with-eab.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: zerossl-prod
spec:
  acme:
    # ZeroSSL ACME endpoint
    server: https://acme.zerossl.com/v2/DV90

    # Email for certificate notifications
    email: certificates@example.com

    # ACME account private key secret
    privateKeySecretRef:
      name: zerossl-account-key

    # External Account Binding configuration
    externalAccountBinding:
      # Reference to EAB credentials secret
      keyID: YOUR_KEY_ID
      keySecretRef:
        name: zerossl-eab
        key: hmac-key

      # Key algorithm (default: HS256)
      keyAlgorithm: HS256

    # Solvers for ACME challenges
    solvers:
    - http01:
        ingress:
          class: nginx
```

Apply the ClusterIssuer:

```bash
kubectl apply -f zerossl-issuer-with-eab.yaml

# Check ClusterIssuer status
kubectl get clusterissuer zerossl-prod
kubectl describe clusterissuer zerossl-prod
```

The first certificate request triggers ACME account registration with EAB validation.

## Using EAB with DNS-01 Challenges

Configure EAB with DNS-01 for wildcard certificates:

```yaml
# zerossl-dns01-eab.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: zerossl-dns01
spec:
  acme:
    server: https://acme.zerossl.com/v2/DV90
    email: certificates@example.com
    privateKeySecretRef:
      name: zerossl-dns01-account-key

    # EAB configuration
    externalAccountBinding:
      keyID: YOUR_KEY_ID
      keySecretRef:
        name: zerossl-eab
        key: hmac-key

    # DNS-01 solver
    solvers:
    - dns01:
        route53:
          region: us-east-1
          # Use IRSA for AWS authentication
```

Request a wildcard certificate:

```yaml
# wildcard-cert-with-eab.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-zerossl-cert
  namespace: production
spec:
  secretName: wildcard-zerossl-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: zerossl-dns01
    kind: ClusterIssuer

  commonName: "*.example.com"
  dnsNames:
  - "*.example.com"
  - "example.com"
```

## EAB with Multiple ACME Providers

Manage certificates from multiple ACME providers with different EAB credentials:

```yaml
# multi-provider-eab.yaml
---
# ZeroSSL Issuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: zerossl-issuer
spec:
  acme:
    server: https://acme.zerossl.com/v2/DV90
    email: certificates@example.com
    privateKeySecretRef:
      name: zerossl-account-key
    externalAccountBinding:
      keyID: ZEROSSL_KEY_ID
      keySecretRef:
        name: zerossl-eab
        key: hmac-key
    solvers:
    - http01:
        ingress:
          class: nginx
---
# Enterprise Let's Encrypt Issuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-enterprise
spec:
  acme:
    server: https://acme-enterprise.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-enterprise-account-key
    externalAccountBinding:
      keyID: LETSENCRYPT_KEY_ID
      keySecretRef:
        name: letsencrypt-eab
        key: hmac-key
    solvers:
    - http01:
        ingress:
          class: nginx
---
# Standard Let's Encrypt (no EAB required)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-standard
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: certificates@example.com
    privateKeySecretRef:
      name: letsencrypt-standard-account-key
    # No EAB section needed for standard Let's Encrypt
    solvers:
    - http01:
        ingress:
          class: nginx
```

Applications choose the appropriate issuer based on requirements.

## Rotating EAB Credentials

When EAB credentials rotate, update the secret:

```bash
# Update EAB secret with new credentials
kubectl create secret generic zerossl-eab \
  --from-literal=key-id='NEW_KEY_ID' \
  --from-literal=hmac-key='NEW_BASE64_HMAC_KEY' \
  -n cert-manager \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart cert-manager to pick up new credentials
kubectl rollout restart deployment cert-manager -n cert-manager
```

Note: Rotating EAB credentials may require creating a new ACME account. Check provider documentation for credential rotation procedures.

## Testing EAB Configuration

Test EAB configuration with a test certificate:

```yaml
# eab-test-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: eab-test-cert
  namespace: default
spec:
  secretName: eab-test-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: zerossl-prod
    kind: ClusterIssuer

  dnsNames:
  - test.example.com
```

Apply and monitor:

```bash
kubectl apply -f eab-test-certificate.yaml

# Watch certificate issuance
kubectl get certificate eab-test-cert -w

# Check for EAB-related errors
kubectl describe certificate eab-test-cert

# View cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager | grep -i eab
```

Common EAB errors include:
- Invalid Key ID (wrong identifier)
- Invalid HMAC key (incorrect or malformed key)
- Expired credentials (credentials past validity period)

## EAB with Staging Environments

Use separate EAB credentials for staging:

```yaml
# staging-eab-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: zerossl-staging
spec:
  acme:
    # ZeroSSL staging endpoint (if available)
    server: https://acme.zerossl.com/v2/DV90

    email: staging@example.com
    privateKeySecretRef:
      name: zerossl-staging-account-key

    # Staging EAB credentials
    externalAccountBinding:
      keyID: STAGING_KEY_ID
      keySecretRef:
        name: zerossl-staging-eab
        key: hmac-key

    solvers:
    - http01:
        ingress:
          class: nginx
```

This prevents production EAB credentials from being used in testing, maintaining proper separation.

## Monitoring EAB ACME Accounts

Monitor ACME account registration and usage:

```bash
# Check ACME account registration status
kubectl get clusterissuer -o jsonpath='{.items[*].status.acme.uri}'

# View ACME account details
kubectl get clusterissuer zerossl-prod -o yaml

# Check for account registration errors
kubectl describe clusterissuer zerossl-prod
```

The ACME account URI confirms successful registration with EAB.

## EAB Security Best Practices

Store EAB credentials as Kubernetes secrets, never in source control. EAB keys provide authorization to request certificates.

Use separate EAB credentials for different environments (development, staging, production). This prevents cross-environment credential leakage.

Rotate EAB credentials periodically according to security policies. Many organizations require credential rotation every 90 days.

Monitor EAB credential usage. Track which certificates were issued with which credentials for audit purposes.

Implement proper RBAC for EAB secrets. Limit who can view or modify EAB credential secrets.

## Troubleshooting EAB Issues

### Account Registration Fails

```bash
# Check cert-manager logs for EAB errors
kubectl logs -n cert-manager deployment/cert-manager | grep -i "external account binding"

# Common errors:
# - "invalid key ID": Key ID doesn't exist or is malformed
# - "invalid MAC": HMAC key incorrect or encoding issues
# - "account already exists": Trying to create duplicate account
```

### Invalid HMAC Key Format

```bash
# Verify HMAC key is properly base64 encoded
echo "YOUR_HMAC_KEY" | base64 -d

# If key needs encoding:
echo "YOUR_RAW_KEY" | base64

# Update secret with correctly encoded key
kubectl create secret generic zerossl-eab \
  --from-literal=key-id='YOUR_KEY_ID' \
  --from-literal=hmac-key='CORRECTLY_ENCODED_KEY' \
  -n cert-manager \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Certificate Request Fails After Account Registration

```bash
# Verify ClusterIssuer shows ACME account registered
kubectl get clusterissuer zerossl-prod -o jsonpath='{.status.acme.uri}'

# Check certificate status
kubectl describe certificate <cert-name>

# View CertificateRequest for detailed errors
kubectl get certificaterequest
kubectl describe certificaterequest <request-name>
```

## EAB with Custom ACME Servers

Configure EAB for custom or private ACME servers:

```yaml
# custom-acme-with-eab.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: custom-acme
spec:
  acme:
    # Custom ACME server URL
    server: https://acme.internal.example.com/directory

    email: certificates@example.com
    privateKeySecretRef:
      name: custom-acme-account-key

    # Custom ACME server EAB configuration
    externalAccountBinding:
      keyID: CUSTOM_KEY_ID
      keySecretRef:
        name: custom-acme-eab
        key: hmac-key

    # CA bundle for custom ACME server using private certificates
    caBundle: <base64-encoded-ca-cert>

    solvers:
    - http01:
        ingress:
          class: nginx
```

This enables integration with internal PKI systems exposing ACME endpoints with EAB.

## Rate Limits with EAB Providers

Different ACME providers have different rate limits:

ZeroSSL free tier:
- 90-day certificates
- Multiple certificates per domain
- Subject to fair use policies

Enterprise Let's Encrypt:
- Customizable rate limits based on agreement
- Higher limits than public Let's Encrypt
- Dedicated support

Check provider documentation for specific rate limits and configure issuers accordingly.

## Conclusion

External Account Binding enables cert-manager integration with enterprise and commercial ACME certificate authorities. By providing account validation and authentication, EAB allows organizations to leverage cert-manager's automation while maintaining control over certificate issuance through enterprise account systems.

This capability is essential for organizations requiring commercial ACME services, need billing and quota management, or must comply with policies requiring approved certificate authorities. Combined with cert-manager's automated renewal and monitoring, EAB provides production-ready certificate management with enterprise-grade authentication and control.
