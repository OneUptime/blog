# How to Enable mTLS Between Dapr Sidecars

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Security, Kubernetes, Certificate

Description: Configure mutual TLS (mTLS) between Dapr sidecars to encrypt and authenticate all service-to-service communication within your cluster.

---

Dapr enables mTLS by default in Kubernetes deployments, encrypting all traffic between sidecars. This guide covers how to verify mTLS is active, configure it explicitly, and understand what it protects.

## What Dapr mTLS Provides

Dapr's mTLS implementation:
- Encrypts all sidecar-to-sidecar traffic (service invocation)
- Provides mutual authentication - both sides verify identity
- Uses certificates issued by the Dapr Sentry service
- Rotates certificates automatically every 24 hours by default

## Verifying mTLS is Enabled

Check the Dapr configuration resource:

```bash
# Check the default configuration
kubectl get configuration appconfig -o yaml
```

mTLS is controlled by the `spec.mtls.enabled` field. If no configuration resource exists, mTLS is enabled by default in Kubernetes.

## Explicitly Configuring mTLS

Create a Dapr Configuration resource to control mTLS settings:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

```bash
kubectl apply -f appconfig.yaml
```

Reference the configuration in your deployment:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "order-service"
    dapr.io/config: "appconfig"
```

## Verifying mTLS is Active

Check the sidecar logs for mTLS initialization:

```bash
kubectl logs deploy/order-service -c daprd | grep -i "mtls\|tls\|cert"
```

Expected output:
```text
level=info msg="mTLS enabled" config=appconfig
level=info msg="fetching credentials from sentry" url=dapr-sentry.dapr-system.svc.cluster.local:50001
level=info msg="certificate renewed" expiry="2026-04-01T10:00:00Z"
```

## Disabling mTLS for Development

For local development or debugging, you can disable mTLS:

```yaml
spec:
  mtls:
    enabled: false
```

Warning: Never disable mTLS in production as all inter-service traffic will be unencrypted.

## How Certificate Issuance Works

1. Each sidecar requests a certificate from Dapr Sentry at startup.
2. Sentry signs certificates using the root CA stored in `dapr-trust-bundle` secret.
3. Certificates expire and are automatically renewed before expiry.
4. Both sides verify the peer certificate before establishing a connection.

```bash
# View the trust bundle
kubectl get secret dapr-trust-bundle -n dapr-system -o yaml

# Decode the issuer certificate to inspect it
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.issuer\.crt}' | base64 -d | \
  openssl x509 -noout -text | grep -A2 "Validity"
```

## Checking mTLS in Network Traffic

Use a sidecar network capture to confirm traffic is encrypted:

```bash
# Install tcpdump on the sidecar temporarily
kubectl debug -it pod/order-service-xxx -c daprd --image=nicolaka/netshoot -- \
  tcpdump -i eth0 -s 0 port 50001 -A 2>/dev/null | head -20
```

The output should show TLS handshake records, not readable HTTP headers.

## Summary

Dapr mTLS is enabled by default in Kubernetes and uses certificates issued by the Sentry service to encrypt and authenticate all sidecar-to-sidecar communication. Configure certificate TTL and clock skew tolerance via a Dapr Configuration resource. Always keep mTLS enabled in production - it provides zero-trust security for service invocation without any application code changes.
