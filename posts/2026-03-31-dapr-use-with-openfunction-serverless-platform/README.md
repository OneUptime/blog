# How to Use Dapr with OpenFunction Serverless Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenFunction, Serverless, Function, FaaS

Description: Learn how to build event-driven serverless functions using OpenFunction with Dapr bindings and pub/sub as the event source and output layer.

---

OpenFunction is a CNCF sandbox project that provides a serverless FaaS platform on Kubernetes, built on Dapr, Knative, and KEDA. Dapr serves as the event-driven backbone for OpenFunction - functions are triggered by and interact with Dapr pub/sub and bindings.

## OpenFunction Architecture with Dapr

```text
External Event Source (Kafka, Redis, HTTP)
     |
     v
Dapr Input Binding / Pub/Sub
     |
     v
OpenFunction Runtime (wraps your function)
     |
     v
Dapr Output Binding / State Store
```

Your function code receives events and uses Dapr to interact with downstream systems without direct SDK integration.

## Installing OpenFunction

```bash
# Install OpenFunction with Dapr enabled
helm repo add openfunction https://openfunction.github.io/charts/
helm repo update
helm install openfunction openfunction/openfunction \
  --namespace openfunction \
  --create-namespace \
  --set global.Dapr.enabled=true \
  --set global.Keda.enabled=true

# Verify
kubectl get pods -n openfunction
```

## Writing an OpenFunction Function

Create a simple Go function that processes orders from a Dapr pub/sub topic:

```go
package main

import (
    "encoding/json"
    "fmt"
    ofctx "github.com/OpenFunction/functions-framework-go/context"
)

type Order struct {
    OrderID string  `json:"orderId"`
    Amount  float64 `json:"amount"`
}

func ProcessOrder(ctx ofctx.Context, in []byte) (ofctx.Out, error) {
    var order Order
    if err := json.Unmarshal(in, &order); err != nil {
        return ctx.ReturnOnInternalError()
    }

    fmt.Printf("Processing order: %s, amount: %.2f\n", order.OrderID, order.Amount)

    // Send to output
    ctx.Send("processed-orders", in)
    return ctx.ReturnOnSuccess()
}
```

## Defining the Function Resource

```yaml
apiVersion: core.openfunction.io/v1beta1
kind: Function
metadata:
  name: order-processor
  namespace: production
spec:
  version: "v1.0.0"
  image: myrepo/order-processor:latest
  imageCredentials:
    name: registry-credentials
  build:
    builder: openfunction/builder-go:latest
    env:
      FUNC_NAME: "ProcessOrder"
    srcRepo:
      url: "https://github.com/myorg/order-processor.git"
      sourceSubPath: "."
  serving:
    runtime: "async"
    scaleOptions:
      minReplicas: 0    # Scale to zero when idle
      maxReplicas: 20
    inputs:
      - name: orders-input
        component: pubsub
        topic: orders
    outputs:
      - name: processed-orders
        component: pubsub
        topic: processed-orders
    pubsub:
      pubsub:
        type: pubsub.kafka
        version: v1
        metadata:
          - name: brokers
            value: "kafka:9092"
```

## Dapr Component Integration

OpenFunction uses Dapr components defined in the function spec or shared component YAMLs:

```yaml
# Shared Dapr component for state
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

Functions access this state store through the Dapr sidecar that OpenFunction injects.

## Monitoring OpenFunction with Dapr Metrics

```bash
# Check function scaling events
kubectl get hpa -n production

# View Dapr metrics for the function
kubectl port-forward svc/prometheus 9090 -n monitoring
# Query: dapr_http_server_request_count{app_id="order-processor"}
```

## Summary

OpenFunction uses Dapr as the event-driven backbone for serverless functions on Kubernetes. Functions are triggered by Dapr pub/sub topics or bindings, scale to zero with KEDA, and interact with Dapr state stores and output bindings - all configured in the Function resource's `serving.inputs` and `serving.outputs` sections without direct SDK dependencies.
