# How to Install Custom Certificates in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Certificate, TLS, Security, mTLS

Description: Learn how to install custom TLS certificates in Dapr for mTLS between sidecars and for connecting to external services with private CAs.

---

## Overview

Dapr uses mTLS by default for inter-sidecar communication, generating its own certificates through the Dapr Sentry service. However, enterprise environments often need to use their own CA certificates, replace the root trust bundle, or trust private CAs for external component connections.

## Replacing the Dapr Root Certificate

Generate custom certificates using a CA:

```bash
# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key \
  -out ca.crt \
  -subj "/CN=Dapr Root CA/O=MyOrg"

# Generate issuer key and certificate signed by CA
openssl genrsa -out issuer.key 4096
openssl req -new -key issuer.key \
  -out issuer.csr \
  -subj "/CN=Dapr Issuer/O=MyOrg"
openssl x509 -req -days 365 -in issuer.csr \
  -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out issuer.crt
```

Store the certificates as Kubernetes secrets:

```bash
kubectl create secret generic dapr-trust-bundle \
  --from-file=ca.crt \
  --from-file=issuer.crt \
  --from-file=issuer.key \
  -n dapr-system
```

## Installing via Helm

Pass the certificate paths when installing or upgrading Dapr:

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --set-file dapr_sentry.tls.issuer.certPEM=issuer.crt \
  --set-file dapr_sentry.tls.issuer.keyPEM=issuer.key \
  --set-file dapr_sentry.tls.root.certPEM=ca.crt \
  --wait
```

## Trusting Private CA for External Components

When a state store or message broker uses mTLS, configure the component with client certificates for authentication:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis.internal.example.com:6379"
  - name: enableTLS
    value: "true"
  - name: clientCert
    secretKeyRef:
      name: redis-client-cert
      key: tls.crt
  - name: clientKey
    secretKeyRef:
      name: redis-client-cert
      key: tls.key
```

Note: The available TLS metadata fields vary by component. The Redis state store supports `enableTLS`, `clientCert`, and `clientKey` but does not have a `caCert` field. To trust a private CA for Redis, mount the CA certificate into the sidecar container's trust store.

## Verifying Certificate Rotation

Check when the current Dapr certificates expire:

```bash
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | \
  openssl x509 -noout -dates
```

## Rotating Certificates

To rotate certificates without downtime:

```bash
# Update the secret with new certificates
kubectl create secret generic dapr-trust-bundle \
  --from-file=ca.crt=new-ca.crt \
  --from-file=issuer.crt=new-issuer.crt \
  --from-file=issuer.key=new-issuer.key \
  -n dapr-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Sentry to pick up new certificates
kubectl rollout restart deployment dapr-sentry -n dapr-system
```

## Summary

Dapr supports custom CA certificates for both inter-sidecar mTLS and external component connections. Replace the default Dapr trust bundle using Helm values or Kubernetes secrets, and configure individual components to trust private CAs for external services. Always monitor certificate expiration and automate rotation to prevent outages.
