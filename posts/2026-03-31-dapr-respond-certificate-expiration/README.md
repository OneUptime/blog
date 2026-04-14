# How to Respond to Dapr Certificate Expiration Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Certificate, mTLS, Incident Response

Description: Respond to Dapr certificate expiration alerts by checking certificate validity, renewing trust bundles, and configuring automated rotation to prevent service disruptions.

---

## Why Dapr Certificates Matter

Dapr uses mutual TLS (mTLS) to secure all communication between sidecars and between sidecars and the control plane. The `dapr-sentry` service acts as a Certificate Authority, issuing workload certificates with a default validity of 24 hours (renewed automatically) and a root certificate valid for 1 year by default. When the root or issuer certificate expires, new sidecars cannot start and secure communication breaks.

## Step 1 - Check Certificate Expiry

Inspect the current trust bundle:

```bash
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -noout -dates
```

Check the issuer certificate:

```bash
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.issuer\.crt}' | base64 -d | openssl x509 -noout -dates
```

Expected output:
```text
notBefore=Mar 31 00:00:00 2025 GMT
notAfter=Mar 31 00:00:00 2026 GMT
```

If `notAfter` has passed or is within days, renew immediately.

## Step 2 - Renew Certificates with Dapr CLI

The simplest renewal uses the Dapr CLI:

```bash
# Renew for 2 years (730 days)
dapr mtls renew-certificate -k --valid-until 730
```

Verify renewal succeeded:

```bash
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -noout -dates
```

## Step 3 - Restart Sidecars to Pick Up New Certificates

Existing sidecars do not automatically reload the root certificate. Rolling restart all Dapr-enabled deployments:

```bash
# Restart all deployments in a namespace
kubectl rollout restart deployment -n my-namespace

# Or target specific deployments
kubectl rollout restart deployment/orders-api deployment/inventory-api -n my-namespace
```

## Step 4 - Use Custom Certificates for Longer Validity

Generate a custom CA with a longer validity period:

```bash
# Generate root CA valid for 10 years
openssl genrsa -out root.key 4096
openssl req -x509 -new -nodes -key root.key -sha256 -days 3650 \
  -out root.crt -subj "/CN=dapr-root-ca"

# Generate issuer certificate
openssl genrsa -out issuer.key 4096
openssl req -new -key issuer.key -out issuer.csr -subj "/CN=dapr-issuer"
openssl x509 -req -in issuer.csr -CA root.crt -CAkey root.key \
  -CAcreateserial -out issuer.crt -days 3650 -sha256
```

Install with custom certificates:

```bash
dapr init -k \
  --set dapr_sentry.tls.root.certPEM="$(cat root.crt | base64)" \
  --set dapr_sentry.tls.issuer.certPEM="$(cat issuer.crt | base64)" \
  --set dapr_sentry.tls.issuer.keyPEM="$(cat issuer.key | base64)"
```

## Step 5 - Set Up Expiry Monitoring

Add a Prometheus alert to catch expiry before it occurs:

```yaml
- alert: DaprCertificateExpiringSoon
  expr: (dapr_sentry_issuercert_expiry_timestamp - time()) < 604800
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Dapr certificate expires in less than 7 days"
```

## Summary

Dapr certificate expiration causes sidecar startup failures and breaks mTLS communication. Respond by checking the trust bundle expiry, renewing with the Dapr CLI or custom certificates, and rolling restarting workloads to pick up the new root CA. Implement expiry monitoring alerts to catch issues at least a week before they occur.
