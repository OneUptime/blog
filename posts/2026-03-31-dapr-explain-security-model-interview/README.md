# How to Explain Dapr Security Model in an Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Interview, mTLS, Authorization

Description: Understand how to explain Dapr's security model in interviews, including mTLS, token authentication, access control policies, and secret management.

---

## Dapr's Security Architecture Overview

When asked about Dapr security in an interview, structure your answer around four layers: transport security, service authentication, access control, and secret management. Dapr addresses each layer through its sidecar architecture.

The sidecar model is itself a security boundary - your application only communicates with its local Dapr sidecar, never directly with other services. All inter-service communication flows through Dapr sidecars over mTLS.

## Mutual TLS (mTLS)

Dapr enables mTLS by default in Kubernetes mode. The Dapr Sentry service acts as a Certificate Authority (CA) that issues workload certificates.

```bash
# Check mTLS status in Kubernetes
kubectl get configurations/daprsystem -o yaml | grep mtls

# Disable mTLS for development (not recommended in production)
helm upgrade dapr dapr/dapr --set global.mtls.enabled=false
```

```yaml
# Dapr system configuration
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

## API Token Authentication

For HTTP API access, Dapr supports token-based authentication to protect the sidecar API from unauthorized callers within the same pod network.

```bash
# Set the Dapr API token
export DAPR_API_TOKEN="my-secret-token"

# Dapr sidecar validates this header on inbound calls
curl -H "dapr-api-token: my-secret-token" \
  http://localhost:3500/v1.0/invoke/myapp/method/hello
```

## Access Control Policies

Explain how Dapr lets you define which services can call which methods on your application:

```yaml
# Configuration with access control
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
    - appId: frontend-service
      defaultAction: deny
      trustDomain: "public"
      namespace: "default"
      operations:
      - name: /api/orders
        httpVerb: ["GET", "POST"]
        action: allow
    - appId: admin-service
      defaultAction: allow
      trustDomain: "public"
      namespace: "default"
```

## Secret Management

A key security feature is how Dapr abstracts secret stores. Applications request secrets by name from their sidecar - never accessing vault APIs directly.

```bash
# Fetch a secret via Dapr API
curl http://localhost:3500/v1.0/secrets/my-secret-store/db-password

# Response
# {"db-password": "supersecretvalue"}
```

```yaml
# Secret store component
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-secret-store
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com"
  - name: skipVerify
    value: "false"
```

## Interview Framing: Defense in Depth

Structure your answer as defense in depth:

1. **Network layer** - mTLS encrypts all sidecar-to-sidecar traffic
2. **Identity layer** - Each service gets a SPIFFE-compliant certificate
3. **Authorization layer** - Access control policies restrict method-level access
4. **Secret layer** - Applications never handle raw secret store credentials

```bash
# Check if mTLS is enabled in the Kubernetes cluster
dapr mtls -k
```

## Summary

Dapr's security model provides defense in depth through automatic mTLS between all sidecar communications, token-based API authentication, declarative access control policies, and abstracted secret management. In interviews, emphasize that Dapr makes secure-by-default behavior the path of least resistance, removing the burden of implementing mTLS and certificate rotation from development teams.
