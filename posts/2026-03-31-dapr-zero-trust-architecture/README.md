# How to Implement Zero Trust Architecture with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Zero Trust, Security, mTLS, Authorization, Microservice

Description: Learn how to implement zero trust architecture with Dapr by enforcing mTLS, access policies, and secret management so no service is implicitly trusted.

---

Zero trust architecture operates on the principle of "never trust, always verify." Every service-to-service communication must be authenticated and authorized, regardless of network location. Dapr provides built-in mechanisms to implement zero trust across your microservices.

## Zero Trust Pillars in Dapr

Dapr enables zero trust through:
1. Mutual TLS (mTLS) for all sidecar-to-sidecar communication
2. Access control policies to restrict which services can call which APIs
3. Secret store integration to avoid hardcoded credentials
4. Scoped components to limit which apps can use which resources

## Enable mTLS in the Dapr Configuration

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

## Define Access Control Policies

Restrict which services can call which operations:

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
    - appId: api-gateway
      defaultAction: allow
      namespace: "default"
      operations:
      - name: /v1/orders/*
        httpVerb: ["GET", "POST"]
        action: allow
    - appId: inventory-service
      defaultAction: deny
      namespace: "default"
      operations:
      - name: /v1/orders/reserve
        httpVerb: ["POST"]
        action: allow
```

## Scoped Components for Least Privilege

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-db
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
scopes:
- order-service
- order-processor
```

## Secret Management - No Hardcoded Credentials

```python
import requests

def get_db_password() -> str:
    # Retrieve secret through Dapr - never hardcode credentials
    resp = requests.get(
        "http://localhost:3500/v1.0/secrets/vault/db-password"
    )
    resp.raise_for_status()
    return resp.json()["db-password"]

def call_service_securely(service: str, endpoint: str, data: dict) -> dict:
    # mTLS is enforced automatically by the Dapr sidecar
    resp = requests.post(
        f"http://localhost:3500/v1.0/invoke/{service}/method/{endpoint}",
        json=data
    )
    resp.raise_for_status()
    return resp.json()
```

## Verifying mTLS is Active

```bash
# Check the Dapr configuration for mTLS status
kubectl get configurations dapr-config -o jsonpath='{.spec.mtls}'

# Verify trust bundle in the control plane
kubectl get secret dapr-trust-bundle -n dapr-system -o yaml

# Check sidecar logs to confirm mTLS handshakes
kubectl logs deployment/order-service -c daprd | grep -i "mtls\|certificate"
```

## Network Policy to Enforce Sidecar Traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dapr-sidecar-only
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          dapr-enabled: "true"
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: dapr-system
```

## Summary

Zero trust with Dapr is achieved by enabling mTLS for all inter-service communication, defining explicit access control policies that default to deny, scoping components to specific applications, and sourcing all secrets through Dapr's secret API. Together these controls ensure no service is implicitly trusted regardless of its network location.
