# How to Understand X.509 Certificates in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, X.509, Certificates, mTLS, Security, PKI

Description: A clear explanation of how X.509 certificates work in Istio, covering certificate structure, the trust chain, istiod as a CA, and how workload identities are represented.

---

If you have been working with Istio and mTLS, you have probably seen references to X.509 certificates everywhere. Understanding how these certificates work in the context of Istio is crucial for debugging mTLS issues, configuring custom CAs, and generally knowing what is happening under the hood.

## What Are X.509 Certificates?

X.509 is a standard format for public key certificates. These certificates bind an identity to a public key and are signed by a certificate authority (CA) to prove that the binding is legitimate. When two services in your mesh communicate over mTLS, they each present an X.509 certificate to prove their identity.

A certificate contains several important fields:

- **Subject** - Who the certificate belongs to
- **Issuer** - Who signed the certificate
- **Serial Number** - A unique identifier for the certificate
- **Validity Period** - Not Before and Not After dates
- **Public Key** - The public key associated with the identity
- **Subject Alternative Name (SAN)** - Additional identities (this is the important one in Istio)
- **Signature** - The CA's signature proving the certificate is legitimate

## How Istio Issues Certificates

When a pod starts up with an Istio sidecar, here is what happens:

1. The Envoy sidecar generates a private key and a Certificate Signing Request (CSR)
2. The istio-agent (pilot-agent) in the sidecar sends the CSR to istiod
3. istiod validates that the request is legitimate (using the Kubernetes service account token)
4. istiod signs the certificate using its CA private key
5. The signed certificate is sent back to the sidecar
6. The sidecar uses this certificate for all mTLS connections

You can see this in action by checking the certificates on a running pod:

```bash
# Get the certificate from a sidecar
istioctl proxy-config secret <pod-name> -o json
```

This shows you the full certificate chain, including the root CA cert, the workload cert, and the certificate chain.

## SPIFFE Identities

Istio uses the SPIFFE (Secure Production Identity Framework for Everyone) standard for workload identities. Every workload gets a SPIFFE ID encoded in the SAN field of its certificate. The format is:

```text
spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

For example, a pod running in the `default` namespace with the `my-api` service account in a cluster with the trust domain `cluster.local` gets:

```text
spiffe://cluster.local/ns/default/sa/my-api
```

You can check the trust domain in your Istio configuration:

```bash
kubectl get cm istio -n istio-system -o jsonpath='{.data.mesh}' | grep trustDomain
```

## Examining Certificates

To actually look at the certificates Istio issues, you can extract them from a running sidecar:

```bash
# Get the certificate chain
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

This will show you something like:

```text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: ...
        Signature Algorithm: SHA256-RSA
        Issuer: O = cluster.local
        Validity
            Not Before: Feb 24 00:00:00 2026 GMT
            Not After : Feb 25 00:00:00 2026 GMT
        Subject:
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
        X509v3 extensions:
            X509v3 Subject Alternative Name: critical
                URI:spiffe://cluster.local/ns/default/sa/my-api
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Extended Key Usage:
                TLS Web Server Authentication, TLS Web Client Authentication
```

Notice a few things here:

- The Subject field is empty. Istio puts the identity in the SAN, not the Subject.
- The SAN contains the SPIFFE URI.
- The validity period is very short (24 hours by default). This limits the damage if a certificate is compromised.
- The Extended Key Usage includes both server and client authentication because both sides of an mTLS connection need to present certificates.

## The Certificate Trust Chain

Istio uses a chain of trust:

```text
Root CA Certificate
  └── Intermediate CA Certificate (istiod's CA)
       └── Workload Certificate (sidecar)
```

When two services establish an mTLS connection, they each verify the other's certificate chain up to the shared root CA. If both certificates chain back to the same root, the connection is trusted.

You can view the root certificate:

```bash
# Get the root cert from the mesh config
kubectl get cm istio-ca-root-cert -n default -o jsonpath='{.data.root-cert\.pem}' | \
  openssl x509 -text -noout
```

The `istio-ca-root-cert` ConfigMap is automatically created in every namespace. It contains the root CA certificate that sidecars use to verify peer certificates.

## Certificate Lifetimes

By default, Istio workload certificates are valid for 24 hours. You can change this:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: 48h0m0s
```

Or configure it on istiod:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        DEFAULT_WORKLOAD_CERT_TTL: "48h"
        MAX_WORKLOAD_CERT_TTL: "96h"
```

The `MAX_WORKLOAD_CERT_TTL` sets an upper limit that individual workloads cannot exceed.

## Key Types and Algorithms

Istio supports RSA and EC keys for workload certificates. EC keys are smaller and faster:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_WORKLOAD_CERT_KEY_TYPE: EC
        ISTIO_META_WORKLOAD_CERT_KEY_SIZE: "256"
```

For RSA keys:

```yaml
ISTIO_META_WORKLOAD_CERT_KEY_TYPE: RSA
ISTIO_META_WORKLOAD_CERT_KEY_SIZE: "2048"
```

## Debugging Certificate Issues

When mTLS connections fail, it is usually a certificate problem. Here are the common debugging steps:

```bash
# Check if the certificate is valid
istioctl proxy-config secret <pod-name> -o json | \
  jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  tr -d '"' | base64 -d | openssl x509 -dates -noout

# Verify the certificate chain
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl verify -CAfile <(kubectl get cm istio-ca-root-cert -o jsonpath='{.data.root-cert\.pem}')

# Check if istiod is healthy and serving certificates
kubectl logs -n istio-system deploy/istiod | grep -i "certificate"
```

## Common Certificate Fields in Istio

Here is a summary of what each X.509 field means in the Istio context:

| Field | Istio Usage |
|-------|-------------|
| Subject | Usually empty |
| SAN (URI) | SPIFFE identity of the workload |
| Issuer | The Istio CA that signed the cert |
| Not Before / Not After | Validity window (default 24h) |
| Key Usage | Digital Signature, Key Encipherment |
| Extended Key Usage | Server Auth + Client Auth |

Understanding X.509 certificates in Istio is foundational for anyone operating a service mesh. Once you know how certificates are issued, what they contain, and how the trust chain works, debugging mTLS issues becomes much more straightforward. The key insight is that Istio automates all of this certificate management for you, but knowing what is happening behind the scenes makes you much more effective at troubleshooting.
