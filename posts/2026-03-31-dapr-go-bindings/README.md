# How to Use Dapr Bindings with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Binding, Integration, Microservice, SDK

Description: Connect Go microservices to external systems like cron, Kafka, S3, and SMTP using Dapr input and output bindings without direct SDK dependencies.

---

## Overview

Dapr bindings let Go services interact with external systems and cloud services through a uniform API. Input bindings trigger your service when an event arrives from an external source (a cron timer, a Kafka message, an S3 upload). Output bindings let your service send data to external systems without importing their native SDKs.

## Configuring an Output Binding (HTTP Request)

```yaml
# components/http-output.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: http-output
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: "https://webhook.example.com/notify"
```

## Invoking an Output Binding

```go
package main

import (
    "context"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()

    // Invoke an output binding
    in := &dapr.InvokeBindingRequest{
        Name:      "http-output",
        Operation: "post",
        Data:      []byte(`{"event":"user-signup","userId":"u-123"}`),
        Metadata: map[string]string{
            "Content-Type": "application/json",
        },
    }

    resp, err := client.InvokeBinding(ctx, in)
    if err != nil {
        log.Fatalf("binding invocation failed: %v", err)
    }
    log.Printf("Binding response: %s", resp.Data)
}
```

## Configuring an Input Binding (Cron)

```yaml
# components/cron-input.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron-trigger
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "@every 30s"
```

## Handling Input Binding Events

```go
package main

import (
    "context"
    "log"

    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

func main() {
    s := daprd.NewService(":8080")

    if err := s.AddBindingInvocationHandler("cron-trigger", cronHandler); err != nil {
        log.Fatalf("error adding binding handler: %v", err)
    }

    if err := s.Start(); err != nil {
        log.Fatal(err)
    }
}

func cronHandler(ctx context.Context, in *common.BindingEvent) ([]byte, error) {
    log.Printf("Cron triggered - data: %s, metadata: %v", in.Data, in.Metadata)
    // Execute scheduled work here
    return nil, nil
}
```

## Kafka Output Binding Example

```yaml
# components/kafka-output.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-output
spec:
  type: bindings.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: topics
      value: "events"
    - name: publishTopic
      value: "events"
```

```go
in := &dapr.InvokeBindingRequest{
    Name:      "kafka-output",
    Operation: "create",
    Data:      []byte(`{"event":"page-view","path":"/products"}`),
}
_, err = client.InvokeBinding(ctx, in)
```

## Summary

Dapr bindings isolate Go services from the complexity of external system SDKs. Input binding handlers follow the same pattern as pub/sub handlers, while output binding calls are a single `InvokeBinding` call. This approach makes it easy to swap external integrations by changing component YAML without touching application code.
