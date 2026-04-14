# How to Renew mTLS Certificates in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Certificate, Security, Kubernetes

Description: Renew Dapr mTLS root and issuer certificates before expiry to prevent cluster-wide service disruption caused by expired credentials.

---

Dapr uses a certificate hierarchy for mTLS: a root CA certificate and an issuer certificate. Workload certificates are automatically renewed, but the root CA and issuer certificates require manual rotation. This guide covers both automatic and manual certificate renewal.

## Certificate Hierarchy

Dapr's certificate chain:

```text
Root CA Certificate (self-signed, stored in dapr-trust-bundle)
  |
  +-- Issuer Certificate (signed by root CA, used by Sentry)
        |
        +-- Workload Certificates (issued to each sidecar, 24h TTL)
```

Workload certificates auto-renew. Root CA and issuer certificates must be manually renewed when they expire.

## Checking Current Certificate Expiry

```bash
# Check root CA expiry
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -noout -enddate

# Check issuer certificate expiry
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.issuer\.crt}' | base64 -d | \
  openssl x509 -noout -enddate
```

## Option 1 - Renew Using the Dapr CLI

The Dapr CLI provides a built-in command to renew certificates:

```bash
# Install/update the Dapr CLI
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash

# Renew the certificates (this regenerates root CA and issuer certs)
dapr mtls renew-certificate -k --valid-until 365
```

The `--valid-until` flag sets the new certificate validity period.

## Option 2 - Manual Certificate Renewal

Generate new root CA and issuer certificates:

```bash
# Generate new root CA private key
openssl genrsa -out root.key 4096

# Generate root CA certificate (valid for 3 years)
openssl req -x509 -new -nodes -key root.key \
  -sha256 -days 1095 \
  -subj "/CN=cluster.local/O=dapr.io" \
  -out root.crt

# Generate issuer key
openssl genrsa -out issuer.key 4096

# Create issuer CSR
openssl req -new -key issuer.key \
  -subj "/CN=cluster.local/O=dapr.io" \
  -out issuer.csr

# Sign issuer certificate with root CA
openssl x509 -req -in issuer.csr \
  -CA root.crt -CAkey root.key \
  -CAcreateserial -days 365 \
  -sha256 -out issuer.crt
```

Update the Kubernetes secret:

```bash
kubectl create secret generic dapr-trust-bundle \
  --namespace dapr-system \
  --from-file=ca.crt=root.crt \
  --from-file=issuer.crt=issuer.crt \
  --from-file=issuer.key=issuer.key \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Restarting Sentry After Certificate Update

The Sentry service must be restarted to pick up the new certificates:

```bash
kubectl rollout restart deploy/dapr-sentry -n dapr-system

# Wait for Sentry to be ready
kubectl rollout status deploy/dapr-sentry -n dapr-system
```

## Restarting Application Sidecars

After Sentry is running with new certificates, restart application pods to obtain new workload certificates:

```bash
# Restart all deployments in the default namespace
kubectl rollout restart deployment --namespace default

# Or restart specific services
kubectl rollout restart deployment/order-service deployment/inventory-service
```

## Setting Up Expiry Monitoring

Create a Prometheus alert to warn before expiry:

```yaml
- alert: DaprRootCACertExpiringSoon
  expr: |
    (dapr_sentry_cert_sign_request_received_total > 0)
    and
    (time() > (dapr_sentry_issuercert_expiry_timestamp - 7 * 24 * 3600))
  labels:
    severity: warning
  annotations:
    summary: "Dapr root CA certificate expires within 7 days"
```

## Summary

Dapr workload certificates auto-renew every 24 hours, but root CA and issuer certificates require manual renewal. Use the `dapr mtls renew-certificate` CLI command for the simplest renewal path, or generate certificates manually with openssl for full control over validity periods. After updating the `dapr-trust-bundle` secret, restart Sentry and then all application pods to propagate the new trust chain.
