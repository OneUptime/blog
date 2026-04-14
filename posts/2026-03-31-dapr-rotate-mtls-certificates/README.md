# How to Rotate Dapr mTLS Certificates Automatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Certificate, Security, Rotation, Kubernetes

Description: Learn how to rotate Dapr mTLS certificates automatically, including workload certificate TTL configuration, root CA rotation, and monitoring certificate expiry.

---

Dapr issues short-lived workload certificates that rotate automatically before expiry. However, the root and issuer CA certificates require manual rotation periodically. This guide covers both automatic workload rotation and manual CA rotation procedures.

## Understanding Dapr Certificate Hierarchy

Dapr uses a three-tier certificate hierarchy:
1. Root CA certificate (long-lived, self-signed or externally provided)
2. Issuer/Intermediate CA certificate (signed by root)
3. Workload certificates (short-lived, issued by Sentry to each sidecar)

Workload certificates rotate automatically. Root and issuer certificates require planned rotation.

## Configure Workload Certificate TTL

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: default
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

Sidecars automatically request new certificates before the TTL expires. The `allowedClockSkew` setting compensates for clock drift between nodes.

## Monitor Certificate Expiry

```bash
# Check certificate expiry dates
dapr mtls expiry
```

```bash
# Set up a monitoring script to alert before expiry
#!/bin/bash
EXPIRY=$(dapr mtls expiry | grep "Expiry date:" | head -1 | sed 's/.*Expiry date: //')
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt 30 ]; then
  echo "WARNING: Certificate expires in $DAYS_LEFT days"
fi
```

## Rotate Root and Issuer Certificates

Generate new certificates using the Dapr CLI:

```bash
# Step 1: Generate new root and issuer certificates
dapr mtls export -o ./old-certs

# Generate new certificates (valid for 1 year)
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key \
  -subj "/O=MyOrg/CN=cluster.local" -out ca.crt

openssl genrsa -out issuer.key 4096
openssl req -new -key issuer.key \
  -subj "/O=MyOrg/CN=cluster.local" -out issuer.csr
openssl x509 -req -days 365 -in issuer.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out issuer.crt
```

```bash
# Step 2: Update the trust bundle secret
kubectl create secret generic dapr-trust-bundle \
  -n dapr-system \
  --from-file=issuer.crt=issuer.crt \
  --from-file=issuer.key=issuer.key \
  --from-file=ca.crt=ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Restart Sentry to pick up new certificates
kubectl rollout restart deployment/dapr-sentry -n dapr-system
kubectl rollout status deployment/dapr-sentry -n dapr-system
```

## Rotate Using the Dapr CLI

```bash
# Use the built-in rotation command
dapr mtls renew-certificate -k \
  --ca-root-certificate ca.crt \
  --issuer-public-certificate issuer.crt \
  --issuer-private-key issuer.key \
  --valid-until 365
```

## Verify Rotation Succeeded

```bash
# Confirm Sentry is issuing certificates with the new root
kubectl logs -n dapr-system -l app=dapr-sentry --tail=50 | grep "certificate"

# Verify new certificate expiry reflects the rotation
dapr mtls expiry
```

## Summary

Dapr workload certificates rotate automatically before their TTL expires, requiring no manual intervention. Root and issuer CA certificates must be rotated manually by updating the `dapr-trust-bundle` secret and restarting Sentry. Monitor certificate expiry with `dapr mtls expiry` and set alerts when issuer certificates have fewer than 30 days remaining.
