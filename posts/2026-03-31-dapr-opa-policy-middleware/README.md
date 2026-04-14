# How to Configure OPA Policy Middleware for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OPA, Policy, Middleware, Authorization

Description: Learn how to configure the Open Policy Agent (OPA) middleware in Dapr to enforce fine-grained authorization policies on HTTP requests to your microservices.

---

## Overview

Open Policy Agent (OPA) is a general-purpose policy engine that evaluates requests against declarative Rego policies. Dapr's OPA middleware integrates OPA directly into the sidecar HTTP pipeline, so you can enforce authorization rules without embedding policy logic in your application code.

## Prerequisites

Deploy OPA as a sidecar or standalone service in your cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opa
  template:
    metadata:
      labels:
        app: opa
    spec:
      containers:
      - name: opa
        image: openpolicyagent/opa:latest
        args: ["run", "--server", "--addr=0.0.0.0:8181"]
        ports:
        - containerPort: 8181
---
apiVersion: v1
kind: Service
metadata:
  name: opa
spec:
  selector:
    app: opa
  ports:
  - port: 8181
    targetPort: 8181
```

## Writing a Rego Policy

Create a Rego policy that evaluates HTTP requests. This example allows only users with the `admin` role to call DELETE endpoints:

```rego
package http.authz

default allow = false

allow {
  input.request.method != "DELETE"
}

allow {
  input.request.method == "DELETE"
  input.request.headers["x-user-roles"] == "admin"
}
```

Load the policy into OPA:

```bash
curl -X PUT http://opa-service:8181/v1/policies/http-authz \
  -H "Content-Type: text/plain" \
  --data-binary @authz.rego
```

## Configuring the Dapr OPA Middleware

Create the middleware component pointing to your OPA instance:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: opa-authz
  namespace: default
spec:
  type: middleware.http.opa
  version: v1
  metadata:
  - name: rego
    value: |
      package http
      default allow = false
      allow {
        input.request.method != "DELETE"
      }
  - name: defaultStatus
    value: "403"
  - name: includedHeaders
    value: "x-user-roles,authorization,content-type"
```

Alternatively, point to an external OPA server:

```yaml
  - name: opaEndpoint
    value: "http://opa.default.svc.cluster.local:8181/v1/data/http/authz/allow"
```

## Attaching to the Pipeline

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: opa-pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: opa-authz
      type: middleware.http.opa
```

```yaml
annotations:
  dapr.io/config: "opa-pipeline"
```

## Testing Policy Enforcement

```bash
# Regular GET - should pass
curl -X GET http://localhost:3500/v1.0/invoke/my-service/method/items \
  -H "x-user-roles: viewer"

# DELETE as admin - should pass
curl -X DELETE http://localhost:3500/v1.0/invoke/my-service/method/items/1 \
  -H "x-user-roles: admin"

# DELETE as viewer - should return 403
curl -X DELETE http://localhost:3500/v1.0/invoke/my-service/method/items/1 \
  -H "x-user-roles: viewer"
```

## Summary

Dapr's OPA middleware externalizes authorization policy from your application code into maintainable Rego rules. You can embed the policy inline in the component or point to a centralized OPA server, enabling policy-as-code workflows where authorization rules are tested, versioned, and deployed independently from application updates.
