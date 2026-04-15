# How to Configure Dapr Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Environment Variable, Configuration, Sidecar, Kubernetes

Description: Learn how to configure Dapr sidecar behavior using environment variables for app IDs, ports, logging levels, and component paths.

---

## Overview

Dapr's sidecar (daprd) behavior can be controlled through environment variables and CLI flags. Understanding which variables affect the sidecar helps you tune logging, component discovery, and API behavior across different deployment environments.

## Core Dapr Environment Variables

Dapr sets environment variables in different containers depending on the deployment mode.

**Injected into application containers on Kubernetes:**

| Variable | Purpose | Example |
|---|---|---|
| `DAPR_HTTP_PORT` | Sidecar HTTP port | `3500` |
| `DAPR_GRPC_PORT` | Sidecar gRPC port | `50001` |

**Injected into the sidecar (daprd) container on Kubernetes:**

| Variable | Purpose | Example |
|---|---|---|
| `NAMESPACE` | Kubernetes namespace | `default` |

**Set by `dapr run` in self-hosted mode:**

| Variable | Purpose | Example |
|---|---|---|
| `APP_ID` | Application identifier | `my-service` |
| `DAPR_HTTP_PORT` | Sidecar HTTP port | `3500` |
| `DAPR_GRPC_PORT` | Sidecar gRPC port | `50001` |

Access them in your application:

```python
import os

dapr_http_port = os.getenv("DAPR_HTTP_PORT", "3500")
dapr_base_url = f"http://localhost:{dapr_http_port}/v1.0"
print(f"Connecting to Dapr at {dapr_base_url}")
```

## Setting Custom Environment Variables via Annotations

Inject environment variables into the Dapr sidecar container:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myservice"
  dapr.io/env: "LOG_LEVEL=debug,OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317"
```

## Configuring Logging Level

Control Dapr log verbosity:

```yaml
annotations:
  dapr.io/log-level: "debug"
  dapr.io/log-as-json: "true"
```

Or via the Helm chart on a per-component basis:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_operator.logLevel=info \
  --set dapr_placement.logLevel=info \
  --set dapr_sidecar_injector.logLevel=info
```

## App-Level Environment Variables

Pass secrets and config values to your application container alongside Dapr:

```yaml
spec:
  containers:
  - name: myapp
    image: myrepo/myapp:latest
    env:
    - name: DB_HOST
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: host
    - name: DAPR_HTTP_PORT
      value: "3500"
```

## Using ConfigMaps for Environment Configuration

Manage non-sensitive configuration centrally:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DAPR_HTTP_PORT: "3500"
  APP_ENV: "production"
  LOG_LEVEL: "info"
```

Reference in your Deployment:

```yaml
envFrom:
- configMapRef:
    name: app-config
```

## Verifying Environment Variables at Runtime

Inspect the sidecar environment in a running pod:

```bash
kubectl exec -it <pod-name> -c daprd -- env | grep -E "DAPR|APP_|NAMESPACE"
```

## Summary

On Kubernetes, Dapr automatically injects `DAPR_HTTP_PORT` and `DAPR_GRPC_PORT` into application containers. In self-hosted mode, `dapr run` also sets `APP_ID`. Use the `dapr.io/env` annotation to pass custom variables to the sidecar, and use standard Kubernetes ConfigMaps and Secrets for application-level configuration to maintain clean separation between app config and Dapr tuning.
