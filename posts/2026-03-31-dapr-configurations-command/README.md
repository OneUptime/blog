# How to Use the dapr configurations Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Configuration, Kubernetes, Tracing

Description: Learn how to use the dapr configurations command to list and inspect Dapr configuration resources controlling tracing, middleware, and resilience settings.

---

## Overview

The `dapr configurations` command lists all Dapr Configuration resources applied to your environment. Dapr Configurations control system-level behaviors including distributed tracing, middleware pipelines, metric collection, and feature flags. This command helps you verify which configuration is active for each application.

## Listing Configurations in Kubernetes

```bash
dapr configurations --kubernetes
```

Sample output:

```text
  NAMESPACE  NAME             TRACING-ENABLED  METRICS-ENABLED  AGE  CREATED
  default    dapr-config      true             true             2h   2026-03-31 10:00.00
  default    debug-config     false            true             1h   2026-03-31 11:00.00
  staging    staging-config   true             true             30m  2026-03-31 11:30.00
```

## Listing in a Specific Namespace

```bash
dapr configurations --kubernetes --namespace production
```

## JSON Output

```bash
dapr configurations --kubernetes --output json
```

Sample JSON output:

```json
[
  {
    "name": "dapr-config",
    "namespace": "default",
    "spec": {
      "tracing": {
        "samplingRate": "1",
        "zipkin": {
          "endpointAddress": "http://zipkin:9411/api/v2/spans"
        }
      },
      "metrics": {
        "enabled": true
      }
    }
  }
]
```

## Example Dapr Configuration Resource

A Configuration is a Kubernetes custom resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: production-config
  namespace: production
spec:
  tracing:
    samplingRate: "0.1"
    otel:
      endpointAddress: "http://otel-collector:4317"
      protocol: grpc
      isSecure: false
  metrics:
    enabled: true
    rules:
      - name: dapr_runtime_service_invocation_req_sent_total
        labels:
          - name: method
            regex:
              "orders/": "orders/.+"
  features:
    - name: ActorStateTTL
      enabled: true
```

Apply it with:

```bash
kubectl apply -f production-config.yaml
```

## Attaching a Configuration to a Pod

Reference the configuration in a pod annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "my-app"
  dapr.io/config: "production-config"
```

## Verifying Which Config is Active

After deploying, list configurations and cross-reference your pod annotations:

```bash
dapr configurations --kubernetes --namespace production
kubectl get pods -n production -o jsonpath='{.items[*].metadata.annotations}'
```

## Summary

`dapr configurations` is the command to use when validating that tracing, middleware, and feature flag settings are applied correctly. It surfaces the Dapr Configuration custom resources active in your cluster, making it straightforward to diagnose why a service might have different observability or security behavior than expected.
