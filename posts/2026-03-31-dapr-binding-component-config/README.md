# How to Configure Dapr Binding Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Component, Configuration, YAML

Description: Learn how to write and configure Dapr binding component YAML files, including metadata fields, secret references, scoping, and validation techniques.

---

## Anatomy of a Dapr Binding Component

Every Dapr binding is defined as a Kubernetes-style YAML resource with three key sections: metadata (name and namespace), spec (type, version, metadata fields), and optional scopes.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-binding       # Referenced by application code
  namespace: production  # Kubernetes namespace (ignored locally)
spec:
  type: bindings.kafka   # Component type
  version: v1            # Component version
  metadata:
  - name: brokers        # Broker-specific configuration
    value: kafka:9092
  - name: topics
    value: orders
  - name: consumerGroup
    value: order-binding-consumers
scopes:                   # Optional: restrict to specific apps
- order-service
```

## Input vs Output Binding Direction

Some binding types support only input (trigger), only output (invoke), or both:

```yaml
# Input binding - triggers your app when events arrive
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 30s"
```

```yaml
# Output binding - your app calls this to send data
spec:
  type: bindings.smtp
  version: v1
  metadata:
  - name: host
    value: smtp.mailserver.com
  - name: port
    value: "587"
```

## Using Secret References

Never put credentials directly in component YAML. Use secret references instead:

```yaml
# Kubernetes secret
metadata:
- name: password
  secretKeyRef:
    name: db-credentials
    key: password
```

```bash
# Create the secret first
kubectl create secret generic db-credentials \
  --from-literal=password=supersecretpassword
```

For local development, use a local secret store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: ./secrets.json
```

## Scoping to Specific Applications

Restrict which applications can use a binding:

```yaml
scopes:
- payment-service
- audit-service
```

Only applications with matching `app-id` values can invoke this binding.

## Component File Organization

For local development, place components in the default directory:

```text
~/.dapr/components/
  kafka-binding.yaml
  smtp-binding.yaml
  s3-binding.yaml
```

Or specify a custom path:

```bash
dapr run --resources-path ./config/components -- node app.js
```

## Validate Component Loading

```bash
# Check if component loaded successfully
curl http://localhost:3500/v1.0/metadata | jq '.components[] | select(.name=="my-binding")'
```

Expected output:

```json
{
  "name": "my-binding",
  "type": "bindings.kafka",
  "version": "v1",
  "capabilities": []
}
```

If the component is missing from this list, check Dapr sidecar logs:

```bash
dapr logs --app-id myapp
```

## Testing the Component

```bash
curl -X POST http://localhost:3500/v1.0/bindings/my-binding \
  -H "Content-Type: application/json" \
  -d '{"operation": "create", "data": "test-payload"}'
```

HTTP 200 confirms the binding component is operational.

## Summary

Dapr binding components are configured through YAML files specifying the component type, version, and metadata fields. Use secret references for credentials, scope components to specific applications for security, and validate loading through the metadata API. Well-organized component files make it easy to swap targets between environments.
