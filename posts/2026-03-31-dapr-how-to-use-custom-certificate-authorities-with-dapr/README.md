# How to Use Custom Certificate Authorities with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, mTLS, Certificate Authority, Kubernetes

Description: Configure Dapr to use a custom certificate authority for mTLS instead of the default self-signed CA for enterprise PKI integration.

---

## Overview

By default, Dapr creates a self-signed root certificate authority (CA) during installation. For enterprise environments, you may need to use your own PKI infrastructure to issue Dapr's trust chain certificates. This guide shows how to generate and configure a custom CA for Dapr's mTLS system.

## Understanding Dapr's Certificate Architecture

Dapr uses a three-tier certificate hierarchy:
1. **Root CA** - The trust anchor, stored as a Kubernetes secret
2. **Issuer certificate** - Signs workload certificates, signed by the root CA
3. **Workload certificates** - Short-lived (24h default) certificates per sidecar

The root CA certificate, issuer certificate, and issuer key are stored in the `dapr-trust-bundle` secret in the `dapr-system` namespace. Workload certificates are issued dynamically by Sentry and held in memory by each sidecar.

## Generate a Custom Root CA

Using OpenSSL:

```bash
# Create directory for certificates
mkdir -p ./dapr-certs && cd ./dapr-certs

# Generate root CA private key
openssl genrsa -out ca.key 4096

# Generate root CA certificate (10-year validity)
openssl req -new -x509 \
  -key ca.key \
  -out ca.crt \
  -days 3650 \
  -subj "/C=US/O=MyCompany/CN=Dapr Root CA"

# Verify
openssl x509 -in ca.crt -text -noout | grep -E "(Issuer|Subject|Validity)"
```

## Generate Issuer Certificate

```bash
# Generate issuer private key
openssl genrsa -out issuer.key 4096

# Create issuer certificate signing request
openssl req -new \
  -key issuer.key \
  -out issuer.csr \
  -subj "/C=US/O=MyCompany/CN=Dapr Issuer"

# Create extension file for issuer cert
cat > issuer.ext << 'EOF'
[v3_ca]
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid:always,issuer
basicConstraints=critical,CA:true,pathlen:0
keyUsage=critical,digitalSignature,cRLSign,keyCertSign
EOF

# Sign issuer cert with root CA
openssl x509 -req \
  -in issuer.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out issuer.crt \
  -days 365 \
  -extfile issuer.ext \
  -extensions v3_ca

# Verify chain
openssl verify -CAfile ca.crt issuer.crt
```

## Install Dapr with Custom Certificates

### During Initial Installation

```bash
dapr init -k \
  --set-string dapr_sentry.tls.issuer.certPEM="$(cat issuer.crt)" \
  --set-string dapr_sentry.tls.issuer.keyPEM="$(cat issuer.key)" \
  --set-string dapr_sentry.tls.root.certPEM="$(cat ca.crt)"
```

Or using Helm:

```bash
helm install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set-string dapr_sentry.tls.issuer.certPEM="$(cat issuer.crt)" \
  --set-string dapr_sentry.tls.issuer.keyPEM="$(cat issuer.key)" \
  --set-string dapr_sentry.tls.root.certPEM="$(cat ca.crt)"
```

### For an Existing Installation

Create the secret directly:

```bash
# Delete existing trust bundle
kubectl delete secret dapr-trust-bundle -n dapr-system

# Create new trust bundle with custom certs
kubectl create secret generic dapr-trust-bundle \
  --from-file=issuer.crt=./issuer.crt \
  --from-file=issuer.key=./issuer.key \
  --from-file=ca.crt=./ca.crt \
  -n dapr-system

# Restart Dapr sentry to pick up new certs
kubectl rollout restart deployment/dapr-sentry -n dapr-system
kubectl rollout status deployment/dapr-sentry -n dapr-system
```

## Verify Certificate Rotation

Check that Dapr is using your custom CA:

```bash
# Get the current trust bundle
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -text -noout | grep -E "(Issuer|Subject)"

# Check sentry logs for cert operations
kubectl logs -n dapr-system -l app=dapr-sentry --tail=50 | \
  grep -i "certificate"
```

## Using cert-manager for Automatic Rotation

Integrate with cert-manager for automated certificate lifecycle management:

```bash
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

Create an Issuer using your CA:

```yaml
# dapr-ca-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dapr-ca-keypair
  namespace: dapr-system
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-ca.crt>
  tls.key: <base64-encoded-ca.key>
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: dapr-ca-issuer
  namespace: dapr-system
spec:
  ca:
    secretName: dapr-ca-keypair
```

```bash
kubectl apply -f dapr-ca-secret.yaml
```

Create the issuer certificate via cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dapr-issuer-cert
  namespace: dapr-system
spec:
  secretName: dapr-trust-bundle
  duration: 8760h  # 1 year
  renewBefore: 720h  # Renew 30 days before expiry
  isCA: true
  privateKey:
    algorithm: RSA
    size: 4096
  subject:
    organizations:
    - MyCompany
  commonName: dapr-issuer
  issuerRef:
    name: dapr-ca-issuer
    kind: Issuer
```

```bash
kubectl apply -f dapr-issuer-cert.yaml
```

## Certificate Expiry Monitoring

Monitor certificate expiration dates:

```bash
#!/bin/bash
# check-dapr-certs.sh

echo "=== Dapr Root CA ==="
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -noout -dates

echo "=== Dapr Issuer Cert ==="
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.issuer\.crt}' | base64 -d | \
  openssl x509 -noout -dates
```

## Summary

Using a custom certificate authority with Dapr integrates its mTLS trust chain into your existing PKI infrastructure instead of relying on a self-signed CA. The three-tier hierarchy (root CA, issuer cert, workload certs) means only the root CA and issuer cert need custom management - Dapr's sentry service issues short-lived workload certificates automatically. Using cert-manager automates issuer certificate rotation so your CA trust chain stays valid without manual intervention.
