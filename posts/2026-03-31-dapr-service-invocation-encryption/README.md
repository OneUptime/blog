# How to Use Dapr Service Invocation with mTLS Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Encryption, Service Invocation, Certificate

Description: Learn how Dapr automatically encrypts service invocation traffic with mutual TLS, how to configure custom certificates, and how to verify encryption is active.

---

## Dapr mTLS for Service Invocation

Dapr automatically encrypts all service-to-service invocation traffic using mutual TLS (mTLS) in Kubernetes mode. Every Dapr sidecar gets a short-lived X.509 certificate from the `dapr-sentry` service. When Service A invokes Service B through Dapr, the connection is encrypted and both sides authenticate their identities.

This happens transparently - no code changes are needed in your application.

## Verifying mTLS Is Enabled

```bash
# Check the global Dapr mTLS configuration
kubectl get configuration daprsystem -n dapr-system -o yaml | grep -A5 mtls
```

Expected output:

```yaml
mtls:
  allowedClockSkew: 15m
  enabled: true
  workloadCertTTL: 24h
```

## How Certificates Are Issued

The `dapr-sentry` service acts as a certificate authority. Each sidecar gets a certificate with a SPIFFE ID format:

```yaml
spiffe://cluster.local/ns/{namespace}/{app-id}
```

Certificates rotate automatically before expiry.

## Configuring Custom Root Certificates

For production, use your own PKI instead of the auto-generated self-signed root:

```bash
# Generate custom root CA
openssl req -x509 -newkey rsa:4096 -keyout root.key -out root.crt \
  -days 3650 -nodes -subj "/CN=Dapr Root CA"

# Create Kubernetes secret with custom certs
kubectl create secret generic dapr-trust-bundle \
  --from-file=issuer.crt=issuer.crt \
  --from-file=issuer.key=issuer.key \
  --from-file=ca.crt=root.crt \
  -n dapr-system
```

## Disabling mTLS (Not Recommended for Production)

For testing in isolated environments:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: dapr-system
spec:
  mtls:
    enabled: false
```

```bash
kubectl apply -f daprsystem-no-mtls.yaml
kubectl rollout restart deployment -n dapr-system
```

## Monitoring Certificate Expiry

```bash
# Check sentry certificate expiry from the trust bundle secret
kubectl get secret dapr-trust-bundle -n dapr-system -o jsonpath='{.data.issuer\.crt}' | \
  base64 -d | openssl x509 -noout -dates
```

## mTLS in Self-Hosted Mode

mTLS is disabled by default in self-hosted mode. To enable it, run the Sentry service and configure your Dapr runtime with a Configuration resource that has mTLS enabled:

```bash
# Run Sentry as the local certificate authority
./sentry --issuer-credentials $HOME/.dapr/certs --trust-domain cluster.local

# Then run your app with mTLS enabled via daprd
daprd --app-id myapp --enable-mtls --sentry-address localhost:50001 --config=./config.yaml
```

## Summary

Dapr automatically applies mTLS encryption to all service invocation traffic in Kubernetes using certificates issued by `dapr-sentry`. No application code changes are needed. For production deployments, replace the auto-generated root CA with your own PKI by creating a `dapr-trust-bundle` secret. Monitor certificate expiry and rotation through sidecar logs and Kubernetes secret TTLs.
