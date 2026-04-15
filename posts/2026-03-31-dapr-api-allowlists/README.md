# How to Restrict Dapr API Access with Allowlists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Allowlist, API, Access Control

Description: Learn how to use Dapr allowlists in Configuration resources to restrict which APIs and operations each sidecar can call, reducing your attack surface.

---

## Overview

Dapr allowlists let you define at the sidecar level which Dapr API building blocks a service is allowed to use. If a service only needs state management, there is no reason to give it access to pub/sub or bindings. Restricting APIs with allowlists follows the principle of least privilege and limits what an attacker can do if a service is compromised.

## Configuring API Allowlists

Allowlists are defined in a Dapr `Configuration` resource using the `api.allowed` field. You specify which API groups the sidecar may expose to the application.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: restricted-config
  namespace: default
spec:
  api:
    allowed:
    - name: state
      version: v1
      protocol: http
    - name: state
      version: v1
      protocol: grpc
    - name: secrets
      version: v1
      protocol: http
```

Apply this to your cluster:

```bash
kubectl apply -f restricted-config.yaml
```

Reference it in your deployment:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "payment-service"
  dapr.io/config: "restricted-config"
```

With this configuration, the `payment-service` sidecar only exposes `state` and `secrets` APIs. Attempts to call `pubsub` or `bindings` return `404 Not Found` because those endpoints are not registered on the sidecar.

## Available API Names

The following API names can be used in allowlists:

| API Name | Description |
|---|---|
| state | State management |
| invoke | Service invocation |
| publish | Pub/sub publishing |
| bindings | Input/output bindings |
| secrets | Secret store access |
| actors | Virtual actors |
| metadata | Sidecar metadata |
| configuration | Configuration API |
| lock | Distributed lock |
| unlock | Distributed unlock |
| crypto | Cryptography |
| subtlecrypto | Subtle cryptography |
| workflows | Workflow API |
| healthz | Health check |
| shutdown | Sidecar shutdown |
| jobs | Jobs API |
| conversation | Conversation API |

## Verifying API Restrictions

Test that blocked APIs return the expected error:

```bash
# This should work (state is allowed)
curl -X GET http://localhost:3500/v1.0/state/my-store/key1 \
  -H "dapr-api-token: mytoken"

# This should fail (publish is not in the allowlist)
curl -X POST http://localhost:3500/v1.0/publish/my-pubsub/orders \
  -H "Content-Type: application/json" \
  -H "dapr-api-token: mytoken" \
  -d '{"orderId": "123"}'
# Expected: 404 Not Found
```

## Combining Allowlists with API Token Authentication

For defense in depth, combine allowlists with API token authentication:

```yaml
spec:
  api:
    allowed:
    - name: state
      version: v1
      protocol: http
```

```bash
kubectl create secret generic dapr-api-token \
  --from-literal=token=supersecrettoken
```

```yaml
annotations:
  dapr.io/api-token-secret: "dapr-api-token"
  dapr.io/config: "restricted-config"
```

## Summary

Dapr API allowlists are a powerful least-privilege mechanism that constrains exactly which building blocks each sidecar exposes to its application. Combined with API token authentication, they provide multiple layers of access control that significantly reduce the blast radius of a compromised microservice.
