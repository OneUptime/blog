# How to Handle Webhook Certificate Rotation in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Webhooks, Certificates, TLS, Kubernetes

Description: How to manage and troubleshoot webhook certificate rotation in Istio including CA bundle updates, certificate expiry, and automated rotation mechanisms.

---

Istio's webhooks communicate with the Kubernetes API server over TLS. The certificates used for this communication need to be rotated periodically, and when they expire or become invalid, webhook calls fail. This means no sidecar injection and no configuration validation. Understanding how Istio manages these certificates and what to do when rotation fails is essential for keeping your mesh healthy.

This guide covers the certificate lifecycle for Istio webhooks, how automatic rotation works, and how to fix issues when it breaks.

## How Webhook TLS Works

When Kubernetes calls an Istio webhook, this happens:

1. The API server reads the `caBundle` from the webhook configuration to know which CA to trust.
2. The API server connects to istiod's HTTPS endpoint.
3. Istiod presents its TLS certificate.
4. The API server verifies the certificate against the `caBundle`.
5. If verification passes, the webhook call proceeds.

If any of these steps fail (expired certificate, mismatched CA, etc.), the webhook call fails.

## Checking Certificate Status

### Check the CA Bundle

```bash
# Extract and check the CA bundle from the mutating webhook
kubectl get mutatingwebhookconfiguration istio-sidecar-injector \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | \
  base64 -d | openssl x509 -noout -text -dates

# Same for the validating webhook
kubectl get validatingwebhookconfiguration istio-validator-istio-system \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | \
  base64 -d | openssl x509 -noout -text -dates
```

### Check Istiod's Serving Certificate

```bash
# Check the certificate istiod is presenting
kubectl exec -n istio-system deploy/istiod -- \
  cat /var/run/secrets/istio-dns/cert-chain.pem | openssl x509 -noout -dates

# Check the full certificate chain
kubectl exec -n istio-system deploy/istiod -- \
  cat /var/run/secrets/istio-dns/cert-chain.pem | openssl crl2pkcs7 -nocrl -certfile /dev/stdin | \
  openssl pkcs7 -print_certs -noout -text | grep -E "Not Before|Not After|Subject:"
```

### Check the Istio CA Certificate

```bash
# Check the root CA certificate
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates

# If using cacerts secret (custom CA)
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates
```

## Automatic Certificate Rotation

Istio handles certificate rotation automatically in most cases. Here is how it works:

### Self-Signed CA (Default)

When Istio uses its built-in self-signed CA:

1. Istiod generates a self-signed root CA certificate on first startup.
2. Istiod uses this CA to sign webhook serving certificates.
3. Istiod updates the `caBundle` in the webhook configurations.
4. When certificates approach expiry, istiod generates new ones.
5. The webhook configurations are updated with the new CA bundle.

This is all automatic. The root CA certificate has a default lifetime of 10 years, and the webhook serving certificates are rotated well before expiry.

### Custom CA (Bring Your Own CA)

When using a custom CA via the `cacerts` secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cacerts
  namespace: istio-system
type: Opaque
data:
  ca-cert.pem: <base64-encoded-ca-cert>
  ca-key.pem: <base64-encoded-ca-key>
  root-cert.pem: <base64-encoded-root-cert>
  cert-chain.pem: <base64-encoded-cert-chain>
```

With a custom CA, you are responsible for rotating the CA certificate before it expires. Istiod will still handle rotating the webhook serving certificates, but they are signed by your CA.

## Triggering Certificate Rotation Manually

### Restart Istiod

The simplest way to force certificate rotation:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

When istiod restarts, it:
1. Checks the existing certificates
2. Generates new ones if needed
3. Updates the webhook configurations with the new CA bundle

### Force CA Bundle Update

If the CA bundle in the webhook configuration is stale:

```bash
# Get the current CA cert from istiod
CA_BUNDLE=$(kubectl exec -n istio-system deploy/istiod -- \
  cat /var/run/secrets/istio-dns/root-cert.pem | base64 | tr -d '\n')

# Update the mutating webhook
kubectl patch mutatingwebhookconfiguration istio-sidecar-injector \
  --type='json' \
  -p="[{\"op\": \"replace\", \"path\": \"/webhooks/0/clientConfig/caBundle\", \"value\": \"${CA_BUNDLE}\"}]"

# Update the validating webhook
kubectl patch validatingwebhookconfiguration istio-validator-istio-system \
  --type='json' \
  -p="[{\"op\": \"replace\", \"path\": \"/webhooks/0/clientConfig/caBundle\", \"value\": \"${CA_BUNDLE}\"}]"
```

## Rotating a Custom CA

If you are using a custom CA and it is approaching expiry, you need to rotate it carefully to avoid disruption.

### Step 1: Generate New CA Certificates

```bash
# Generate a new root CA (using your preferred method)
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -out new-ca-cert.pem \
  -keyout new-ca-key.pem \
  -subj "/O=Istio/CN=Root CA"
```

### Step 2: Create an Intermediate Bundle

During rotation, both the old and new CA certificates need to be trusted. Create a bundle:

```bash
# Combine old and new root certificates
cat new-ca-cert.pem old-root-cert.pem > combined-root-cert.pem
```

### Step 3: Update the cacerts Secret

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem=combined-root-cert.pem \
  --from-file=cert-chain.pem=new-ca-cert.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 4: Restart Istiod

```bash
kubectl rollout restart deployment istiod -n istio-system
kubectl rollout status deployment istiod -n istio-system
```

### Step 5: Verify

```bash
# Check that istiod picked up the new certificates
kubectl logs -n istio-system deploy/istiod | grep -i "cert\|ca\|rotation"

# Verify webhook communication still works
kubectl run test-injection --image=nginx -n my-namespace --dry-run=server -o yaml | grep istio-proxy
```

### Step 6: Restart All Sidecars

Existing sidecars still have the old certificates. Rolling restart all workloads:

```bash
# Restart workloads namespace by namespace
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "Restarting deployments in $ns"
  kubectl rollout restart deployments -n $ns
done
```

### Step 7: Remove Old CA from Bundle

After all workloads have been restarted and are using the new certificates:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=new-ca-cert.pem \
  --from-file=ca-key.pem=new-ca-key.pem \
  --from-file=root-cert.pem=new-ca-cert.pem \
  --from-file=cert-chain.pem=new-ca-cert.pem \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment istiod -n istio-system
```

## Monitoring Certificate Expiry

Set up alerts for certificate expiry:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-cert-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-certificates
    rules:
    - alert: IstioCACertExpiringSoon
      expr: |
        (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 30
      labels:
        severity: warning
      annotations:
        summary: "Istio root CA certificate expires in less than 30 days"

    - alert: IstioWebhookCertExpiringSoon
      expr: |
        (pilot_webhook_cert_expiry_timestamp - time()) / 86400 < 7
      labels:
        severity: critical
      annotations:
        summary: "Istio webhook certificate expires in less than 7 days"
```

You can also check expiry manually:

```bash
#!/bin/bash
echo "=== Istio Certificate Expiry Report ==="

echo -e "\n--- Webhook CA Bundle ---"
kubectl get mutatingwebhookconfiguration istio-sidecar-injector \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | \
  base64 -d | openssl x509 -noout -enddate 2>/dev/null || echo "Could not read"

echo -e "\n--- Istiod Serving Cert ---"
kubectl exec -n istio-system deploy/istiod -- \
  cat /var/run/secrets/istio-dns/cert-chain.pem 2>/dev/null | \
  openssl x509 -noout -enddate 2>/dev/null || echo "Could not read"

echo -e "\n--- Istio CA Cert ---"
kubectl get secret istio-ca-secret -n istio-system \
  -o jsonpath='{.data.ca-cert\.pem}' 2>/dev/null | \
  base64 -d | openssl x509 -noout -enddate 2>/dev/null || echo "Could not read"
```

## Troubleshooting Certificate Issues

### Issue: caBundle Mismatch

The CA bundle in the webhook configuration does not match the CA that signed istiod's certificate:

```bash
# Compare the CA in the webhook with istiod's root cert
WEBHOOK_CA=$(kubectl get mutatingwebhookconfiguration istio-sidecar-injector \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d | openssl x509 -fingerprint -noout)

ISTIOD_CA=$(kubectl exec -n istio-system deploy/istiod -- \
  cat /var/run/secrets/istio-dns/root-cert.pem | openssl x509 -fingerprint -noout)

echo "Webhook CA: $WEBHOOK_CA"
echo "Istiod CA: $ISTIOD_CA"
```

If they do not match, restart istiod. It will update the webhook configuration with the correct CA bundle.

### Issue: Certificate Has Expired

If the certificate has already expired:

```bash
# Quick fix: restart istiod to regenerate certificates
kubectl rollout restart deployment istiod -n istio-system

# If that does not work, delete and recreate the cert secret
kubectl delete secret istio-ca-secret -n istio-system
kubectl rollout restart deployment istiod -n istio-system
```

### Issue: Webhook Works but Sidecars Report Certificate Errors

This usually means the sidecar workload certificates are out of sync:

```bash
# Check sidecar certificate
kubectl exec -n my-namespace deploy/my-service -c istio-proxy -- \
  cat /var/run/secrets/istio/cert-chain.pem | openssl x509 -noout -dates

# Restart the pod to get a fresh certificate
kubectl rollout restart deployment my-service -n my-namespace
```

## Summary

Istio handles webhook certificate rotation automatically in most cases, but you need to understand the mechanism to troubleshoot when it fails. The key components are the CA bundle in the webhook configuration, the serving certificate used by istiod, and the root CA certificate. For self-signed CA setups, rotation is fully automated. For custom CAs, plan for rotation well before expiry and use a phased approach with combined CA bundles to avoid disruption. Monitor certificate expiry dates with Prometheus alerts and run periodic checks to catch issues before they cause webhook failures.
