# How to Configure Dapr Sidecar API Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Security, API, Configuration

Description: Control which Dapr APIs are accessible to your application by configuring API allowlists and blocklists on the sidecar to enforce least-privilege access patterns.

---

Not every application needs access to every Dapr API. A read-only service might only need the state GET API. A worker might only need pub/sub subscriptions. Restricting sidecar API access reduces the attack surface and enforces least-privilege principles.

## API Allowlists in Dapr Configuration

Dapr's Configuration CRD supports an `api` section that lets you restrict which APIs are accessible.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: restrictive-config
  namespace: production
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

With this configuration, only the state management API is accessible. Calls to pub/sub, service invocation, or other APIs are rejected.

## Applying the Configuration to a Specific App

Reference the configuration from your deployment:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "read-only-service"
  dapr.io/config: "restrictive-config"
```

## Available API Names

The following API names can be used in allowlists:

```yaml
- state
- publish
- bindings
- secrets
- actors
- configuration
- lock
- unlock
- workflows
- crypto
- jobs
```

## Allowing Both HTTP and gRPC

If your application uses gRPC, include both protocols:

```yaml
spec:
  api:
    allowed:
      - name: publish
        version: v1.0
        protocol: http
      - name: publish
        version: v1
        protocol: grpc
```

## Blocking Specific APIs

Instead of an allowlist, you can use a blocklist to deny specific APIs while allowing everything else:

```yaml
spec:
  api:
    denied:
      - name: actors
        version: v1.0
        protocol: http
```

This denies access to the actors API while keeping all other APIs accessible.

## Testing API Access

After applying the configuration, verify that restricted APIs return the expected error:

```bash
# This should return 404 if publish is not in the allowlist
curl -X POST http://localhost:3500/v1.0/publish/mypubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123"}'
```

When an API is not in the allowlist, the sidecar does not register the route, so the request returns a 404 Not Found response.

## Summary

Configuring Dapr sidecar API access through allowlists and blocklists enforces least-privilege principles at the API layer. By restricting each service to only the Dapr APIs it actually needs, you reduce the blast radius of a compromised service and make your security posture easier to audit.
