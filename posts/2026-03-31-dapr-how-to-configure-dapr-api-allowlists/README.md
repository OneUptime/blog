# How to Configure Dapr API Allowlists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API Allowlist, Security, Configuration, Microservice

Description: Learn how to configure Dapr API allowlists to restrict which Dapr APIs your application can access, reducing the attack surface of your microservices.

---

## What Are Dapr API Allowlists

Dapr API allowlists (also called allowed API policies) let you restrict which Dapr building block APIs a specific application is permitted to use. For example, you can configure a service to only use pub/sub and state APIs, preventing it from accidentally or maliciously calling bindings, actors, or secrets.

This implements defense-in-depth at the sidecar level.

## Prerequisites

- Dapr installed on Kubernetes or self-hosted
- Basic familiarity with Dapr Configuration resources

## The Default Behavior

Without an API allowlist, a Dapr application can call all Dapr APIs through its sidecar:
- State management
- Pub/sub messaging
- Service invocation
- Bindings
- Actors
- Secrets
- Workflows
- Locks
- Configuration

## Define an API Allowlist via Configuration

Create a `Configuration` resource with an `api.allowed` section:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: restricted-api-config
  namespace: default
spec:
  api:
    allowed:
    - name: state
      version: v1.0
      protocol: http
    - name: publish
      version: v1.0
      protocol: http
    - name: state
      version: v1
      protocol: grpc
    - name: publish
      version: v1
      protocol: grpc
```

This configuration allows only state management and pub/sub APIs. All other APIs (bindings, actors, secrets, etc.) will be blocked — HTTP requests to blocked APIs return `404 Not Found` (because the endpoints are not registered), and gRPC calls return `Unimplemented`.

## Apply the Configuration to a Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "notification-service"
        dapr.io/app-port: "3000"
        dapr.io/config: "restricted-api-config"
```

## Example - Worker Service Allowlist

A worker service that only processes messages from a queue needs pub/sub only:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: worker-api-config
  namespace: default
spec:
  api:
    allowed:
    - name: publish
      version: v1.0
      protocol: http
```

## Example - Data Service Allowlist

A data service that reads and writes state but should not touch secrets or actors:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: data-service-config
  namespace: default
spec:
  api:
    allowed:
    - name: state
      version: v1.0
      protocol: http
    - name: state
      version: v1
      protocol: grpc
```

## Example - Full API Config with Multiple Building Blocks

For a service that needs state, pub/sub, and bindings:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: full-service-config
  namespace: default
spec:
  api:
    allowed:
    - name: state
      version: v1.0
      protocol: http
    - name: publish
      version: v1.0
      protocol: http
    - name: bindings
      version: v1.0
      protocol: http
    - name: secrets
      version: v1.0
      protocol: http
    - name: metadata
      version: v1.0
      protocol: http
    - name: healthz
      version: v1.0
      protocol: http
```

Available API names:

```text
state          - state management
publish        - pub/sub messaging
bindings       - input/output bindings
actors         - virtual actors
secrets        - secret store
configuration  - configuration store
lock           - distributed lock
unlock         - distributed unlock
workflows      - workflow engine
invoke         - service-to-service invocation
metadata       - sidecar metadata
healthz        - health check endpoint
shutdown       - sidecar shutdown
crypto         - cryptography
subtlecrypto   - subtle cryptography
jobs           - job scheduling
conversation   - conversation AI
```

## Test API Restriction

Verify that a blocked API is not accessible:

```bash
# If secrets API is not in the allowlist:
curl http://localhost:3500/v1.0/secrets/mysecretstore/mykey
# Expected: 404 Not Found (endpoint is not registered)

# If state API is in the allowlist:
curl http://localhost:3500/v1.0/state/statestore/mykey
# Expected: 200 OK (or 204 No Content if key doesn't exist)
```

## Use in Self-Hosted Mode

For self-hosted mode, create the configuration file and reference it:

```bash
# Create config file
cat > config/restricted.yaml << 'EOF'
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: restricted-api-config
spec:
  api:
    allowed:
    - name: state
      version: v1.0
      protocol: http
    - name: publish
      version: v1.0
      protocol: http
EOF

# Run with the config
dapr run \
  --app-id my-service \
  --app-port 3000 \
  --config config/restricted.yaml \
  --components-path components \
  node app.js
```

## Combine with ACLs for Defense in Depth

API allowlists control which APIs your service can use. Service invocation ACLs control which services can call your service. Using both together provides layered security:

```yaml
spec:
  api:
    allowed:
    - name: state
      version: v1.0
      protocol: http
    - name: invoke
      version: v1.0
      protocol: http
  accessControl:
    defaultAction: deny
    policies:
    - appId: api-gateway
      defaultAction: allow
      namespace: default
```

## Summary

Dapr API allowlists restrict which Dapr building block APIs a service can invoke through its sidecar, implementing the principle of least privilege at the infrastructure level. By specifying only the APIs each service legitimately needs - state, pub/sub, bindings, etc. - you reduce the blast radius of compromised services and prevent unintended use of powerful APIs like secrets or actors from services that have no business accessing them.
