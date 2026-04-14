# How to Implement Service-to-Service Authentication with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Service Authentication, Security, SPIFFE

Description: Enable mutual TLS (mTLS) between Dapr sidecars to provide cryptographically verified service identity for all service-to-service communication.

---

## mTLS in Dapr

Dapr's control plane includes a Certificate Authority (the Sentry service) that issues short-lived X.509 certificates to each sidecar. These certificates encode the service's SPIFFE identity. Every service-to-service call uses mTLS automatically when you enable it.

## Enabling mTLS

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

## Verifying mTLS Is Active

```bash
# Check Sentry is running
kubectl get pods -n dapr-system

# Verify a sidecar has received its certificate
kubectl logs -n default -l app=my-service -c daprd | grep -i "cert"

# Check Dapr Sentry logs for cert issuance
kubectl logs -n dapr-system -l app=dapr-sentry
```

## SPIFFE Identity Format

Each Dapr service gets a SPIFFE identity of the form:

```yaml
spiffe://cluster.local/ns/{namespace}/{app-id}
```

## Access Control Based on SPIFFE Identity

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: order-service-config
  namespace: default
spec:
  mtls:
    enabled: true
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: "checkout-service"
      defaultAction: allow
      namespace: "default"
    - appId: "admin-service"
      defaultAction: allow
      namespace: "admin"
    # All other callers are denied by default
```

## Using the Forwarded Client Certificate Header

```python
from fastapi import FastAPI, Request
import re

app = FastAPI()

def extract_spiffe_id(cert_header: str) -> str | None:
    # X-Forwarded-Client-Cert: By=<proxy-URI>;Hash=<hash>;URI=spiffe://...
    match = re.search(r"URI=spiffe://([^,;\"]+)", cert_header)
    return f"spiffe://{match.group(1)}" if match else None

@app.get("/internal/health")
async def internal_health(request: Request):
    cert_header = request.headers.get("X-Forwarded-Client-Cert", "")
    spiffe_id = extract_spiffe_id(cert_header)

    if not spiffe_id:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "callerIdentity": spiffe_id
    }
```

## Rotating the Root Certificate

```bash
# Dapr Sentry auto-rotates workload certs based on workloadCertTTL
# To rotate the root CA manually:
kubectl delete secret dapr-trust-bundle -n dapr-system
kubectl rollout restart deployment/dapr-sentry -n dapr-system

# Verify rotation
kubectl get secret dapr-trust-bundle -n dapr-system -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | openssl x509 -noout -dates
```

## Testing mTLS Between Services

```bash
# Call from checkout-service (allowed) - succeeds
kubectl exec -it deploy/checkout-service -- \
  curl http://localhost:3500/v1.0/invoke/order-service/method/create-order \
  -X POST -H "Content-Type: application/json" \
  -d '{"items":["item-1"]}'

# Call from a service not in the policy - 403 Forbidden
kubectl exec -it deploy/unknown-service -- \
  curl http://localhost:3500/v1.0/invoke/order-service/method/create-order \
  -X POST -d '{}'
```

## Summary

Dapr's mTLS implementation provides zero-trust service-to-service authentication out of the box. The Sentry CA issues SPIFFE-compliant certificates automatically, and access control policies enforce which services can talk to which others at the sidecar level. Your application code does not need to implement any authentication for internal service calls.
