# How to Configure Dapr Sentry Service for Certificate Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Certificate, Security, mTLS

Description: Configure the Dapr Sentry service to issue and rotate mTLS certificates for all sidecars, enabling secure service-to-service communication in your cluster.

---

## What Is Dapr Sentry?

The Dapr Sentry service is the certificate authority (CA) for Dapr's mTLS infrastructure. It issues short-lived X.509 certificates to every Dapr sidecar, enabling mutual TLS authentication between services. Sentry also handles automatic certificate rotation before expiry.

## Default Certificate Configuration

By default, Dapr Sentry generates a self-signed root CA on first start. Certificates are issued with a 24-hour validity period and rotated automatically.

Verify the default setup:

```bash
kubectl get secret dapr-trust-bundle -n dapr-system -o yaml
kubectl get configmap dapr-trust-bundle -n dapr-system -o yaml
```

## Configuring Certificate Validity Period

Customize certificate lifetimes via Helm:

```yaml
global:
  mtls:
    workloadCertTTL: 24h
    allowedClockSkew: 15m
```

Apply:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.mtls.workloadCertTTL=24h \
  --set global.mtls.allowedClockSkew=15m \
  --reuse-values
```

## Enabling mTLS Across the Cluster

Ensure mTLS is enabled in your Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: dapr-system
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

```bash
kubectl apply -f dapr-mtls-config.yaml
```

## Viewing Issued Certificates

Check the trust bundle that Sentry distributes to all sidecars:

```bash
# View the CA certificate
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | openssl x509 -text -noout
```

## Verifying mTLS Is Active

Test that two services are communicating over mTLS:

```bash
# Set debug logging on the sidecar via the deployment pod template annotation
# dapr.io/log-level: "debug"
# Then restart or redeploy the pod for the annotation to take effect

# Check sidecar logs for TLS connection events
kubectl logs <pod-name> -c daprd | grep -i "tls\|mtls\|cert"
```

## Sentry High Availability

Run Sentry with 3 replicas for HA:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --reuse-values
```

## Summary

The Dapr Sentry service manages mTLS certificate issuance and rotation for all sidecars. Configure certificate validity periods via Helm or the Dapr Configuration resource, enable mTLS globally, and verify certificate distribution by inspecting the trust bundle secret. Run 3 Sentry replicas in production for high availability.
