# How to Use External Certificate Manager with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Certificate, Cert-Manager, Security

Description: Integrate Dapr with an external certificate manager like cert-manager to use enterprise PKI, automate CA rotation, and manage Dapr trust bundles declaratively.

---

## Why Use cert-manager with Dapr?

Dapr's built-in Sentry service manages mTLS certificates internally. However, many organizations require integration with an external certificate manager for:

- Enterprise PKI chain of trust
- Automated CA rotation with short-lived CAs
- Centralized certificate policy enforcement
- Audit logging through a dedicated certificate system

## Installing cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

## Creating a Root CA with cert-manager

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dapr-root-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: "Dapr Root CA"
  secretName: dapr-root-ca-secret
  duration: 87600h  # 10 years
  renewBefore: 720h
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
```

```bash
kubectl apply -f dapr-root-ca.yaml
```

## Creating a Dapr Issuer Certificate

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: dapr-ca-issuer
spec:
  ca:
    secretName: dapr-root-ca-secret
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dapr-issuer-cert
  namespace: dapr-system
spec:
  isCA: true
  commonName: "Dapr Issuer"
  secretName: dapr-trust-bundle
  duration: 8760h  # 1 year
  renewBefore: 720h
  issuerRef:
    name: dapr-ca-issuer
    kind: ClusterIssuer
  usages:
    - cert sign
    - crl sign
```

```bash
kubectl apply -f dapr-issuer.yaml
```

## Configuring Dapr to Use the cert-manager Secret

By default, Dapr Sentry reads certificates from the `dapr-trust-bundle` secret in the `dapr-system` namespace, but it expects keys named `ca.crt`, `issuer.crt`, and `issuer.key`. cert-manager creates secrets with keys `tls.crt`, `tls.key`, and `ca.crt`. To bridge this mismatch, configure Dapr to use cert-manager's key names:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.issuerFilenames.cert=tls.crt \
  --set global.issuerFilenames.key=tls.key \
  --reuse-values
```

## Verifying the Integration

```bash
# Check that cert-manager created the secret
kubectl get secret dapr-trust-bundle -n dapr-system

# Verify certificate details
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout | grep -E "Issuer|Subject|Not After"
```

## Monitoring cert-manager Certificate Renewal

cert-manager provides metrics for certificate expiry:

```bash
# Certificates nearing expiry
certmanager_certificate_expiration_timestamp_seconds
```

## Summary

Integrate Dapr with cert-manager by creating a ClusterIssuer backed by your root CA and generating an issuer certificate stored in the `dapr-trust-bundle` secret. cert-manager handles automatic rotation of the issuer certificate, while Dapr Sentry uses it to sign workload certificates. This approach provides enterprise-grade PKI management with automated renewal.
