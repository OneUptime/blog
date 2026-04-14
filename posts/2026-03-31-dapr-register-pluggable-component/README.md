# How to Register a Pluggable Component with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, Registration, Kubernetes, Component

Description: Learn how to register and configure a custom pluggable component with Dapr in both local development and Kubernetes production environments.

---

## Pluggable Component Registration Overview

Dapr discovers pluggable components through Unix domain socket files. At startup, the Dapr sidecar scans a configured socket directory (default `/tmp/dapr-components-sockets`) and connects to each component process via gRPC. Using gRPC reflection, Dapr determines which building block APIs each component implements. The component YAML maps a logical name to the component type, which is constructed from the API prefix (e.g., `state`, `pubsub`) and the socket filename (without extension).

## Socket File Convention

The socket filename determines the component name portion of the type. A socket at `/tmp/dapr-components-sockets/my-state-store.sock` provides the name `my-state-store`. Dapr uses gRPC reflection to discover which building block API the component implements (e.g., state store, pub/sub). The full type is the API prefix plus the socket name — for example, `state.my-state-store` if the component implements the state store proto service.

## Local Development Registration

Set the socket folder when starting Dapr:

```bash
# Start your pluggable component process first
./my-state-store-component &

# Start Dapr with the socket folder configured
dapr run --app-id myapp \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  --config ./config.yaml \
  -- python app.py
```

Component YAML (`./components/my-state-store.yaml`):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-state-store
  namespace: default
spec:
  type: state.my-state-store
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: store-secret
      key: connectionString
```

## Kubernetes Registration

In Kubernetes, the pluggable component runs as a sidecar container alongside the Dapr sidecar. Dapr's sidecar injector automatically creates and mounts the shared volume for the socket file when you use the appropriate annotations.

First, annotate your Component resource with the container image details:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-state-store
  annotations:
    dapr.io/component-container: >
      {
        "name": "my-state-store-component",
        "image": "myorg/my-state-store:v1.0.0"
      }
spec:
  type: state.my-state-store
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: store-secret
      key: connectionString
```

Then annotate the pod for Dapr sidecar injection with pluggable component support:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "myapp"
    dapr.io/app-port: "8080"
    dapr.io/inject-pluggable-components: "true"
```

The Deployment itself only needs the application container — the Dapr sidecar injector handles adding the component sidecar container and the shared socket volume:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/app-port: "8080"
        dapr.io/inject-pluggable-components: "true"
    spec:
      containers:
      - name: myapp
        image: myorg/myapp:latest
        ports:
        - containerPort: 8080
```

## Verifying Registration

Check that Dapr recognized the component:

```bash
# Kubernetes
dapr components -k -n default
kubectl get components.dapr.io -n default
kubectl describe component my-state-store -n default
```

Expected output from `dapr components -k`:

```bash
NAMESPACE  NAME            TYPE                 VERSION  SCOPES  CREATED
default    my-state-store  state.my-state-store  v1               2026-03-31 08:00:00
```

## Troubleshooting Socket Connection

If the component fails to register:

```bash
# Check component process is running and socket exists
ls -la /tmp/dapr-components-sockets/

# Check Dapr sidecar logs (Kubernetes)
dapr logs -k --app-id myapp | grep "pluggable"

# Or directly via kubectl
kubectl logs deployment/myapp -c daprd | grep "component"
```

## Summary

Registering a Dapr pluggable component requires starting the component process, ensuring its socket file appears in the configured socket folder, and providing a component YAML that maps a logical name to the component type. In Kubernetes, annotate the Component resource with `dapr.io/component-container` and the pod with `dapr.io/inject-pluggable-components: "true"` to let the sidecar injector handle container and volume setup automatically. Verifying the component appears in `dapr components -k` output confirms successful registration.
