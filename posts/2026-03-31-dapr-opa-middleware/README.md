# How to Use OPA (Open Policy Agent) Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OPA, Middleware, Authorization, Policy

Description: Learn how to configure the Dapr Open Policy Agent middleware to enforce fine-grained authorization policies on incoming HTTP requests using Rego rules.

---

## Introduction

The Dapr OPA middleware (`middleware.http.opa`) integrates Open Policy Agent into the Dapr HTTP pipeline. Every incoming request is evaluated against a Rego policy before being forwarded to your application. This enables fine-grained, attribute-based access control without adding authorization logic to each service.

## Component Configuration

```yaml
# components/opa-middleware.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-opa-middleware
spec:
  type: middleware.http.opa
  version: v1
  metadata:
    - name: rego
      value: |
        package http

        default allow = false

        allow {
          input.request.method == "GET"
          input.request.path == "/public"
        }

        allow {
          input.request.headers["Authorization"] != ""
          startswith(input.request.headers["Authorization"], "Bearer ")
        }
    - name: defaultStatus
      value: "403"
    - name: includedHeaders
      value: "authorization,x-user-id,x-tenant-id"
```

## Writing Rego Policies

OPA uses the Rego language for policy definitions:

```rego
package http

import future.keywords.if
import future.keywords.in

default allow = false

# Allow all GET requests to /public/*
allow if {
  input.request.method == "GET"
  startswith(input.request.path, "/public/")
}

# Allow authenticated users to POST
allow if {
  input.request.method == "POST"
  token := input.request.headers["authorization"]
  startswith(token, "Bearer ")
}

# Allow admins to DELETE
allow if {
  input.request.method == "DELETE"
  input.request.headers["x-role"] == "admin"
}
```

## Pipeline Configuration

```yaml
# config/opa-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: opa-pipeline
spec:
  httpPipeline:
    handlers:
      - name: my-opa-middleware
        type: middleware.http.opa
```

## Running the App

```bash
dapr run \
  --app-id policy-protected-service \
  --app-port 8080 \
  --config ./config/opa-pipeline.yaml \
  --resources-path ./components \
  -- python app.py
```

## Input Object Available in Rego

Dapr passes the following input to OPA for each request:

```json
{
  "request": {
    "method": "POST",
    "path": "/api/orders",
    "headers": {
      "authorization": "Bearer eyJ...",
      "x-user-id": "usr-123",
      "content-type": "application/json"
    },
    "body": "..."
  }
}
```

## Testing Policies

```bash
# Allowed request (GET to /public)
curl http://localhost:3500/v1.0/invoke/policy-protected-service/method/public/info

# Denied request (DELETE without admin role)
curl -X DELETE http://localhost:3500/v1.0/invoke/policy-protected-service/method/orders/1
# Returns 403 Forbidden

# Allowed DELETE (with admin role header)
curl -X DELETE \
  -H "x-role: admin" \
  http://localhost:3500/v1.0/invoke/policy-protected-service/method/orders/1
```

## Summary

The Dapr OPA middleware brings policy-as-code authorization to your microservices without code changes. Write Rego policies in the component YAML or reference an external OPA server, attach the middleware to the pipeline, and Dapr evaluates every request before it reaches your application. This centralizes access control logic and makes policy changes independent of service deployments.
