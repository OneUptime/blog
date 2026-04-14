# How to Use Dapr for Serverless Event Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Serverless, Event Processing, Pub/Sub, Workflow

Description: Build serverless event processing pipelines with Dapr using pub/sub, workflows, and bindings to handle event-driven workloads without managing infrastructure.

---

## Overview

Dapr's pub/sub, bindings, and workflow components enable serverless-style event processing patterns on Kubernetes. By combining event triggers with stateful workflows, you can build scalable, fault-tolerant event pipelines without dedicated queue consumers.

## Event Processing Architecture with Dapr

A typical serverless event processing pipeline:

```json
[External Event Source] -> [Input Binding / Pub/Sub] -> [Dapr App] -> [Workflow] -> [Output Binding]
```

## Input Binding: Trigger on External Events

```yaml
# components/cron-trigger.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: scheduled-trigger
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 30s"
```

```yaml
# components/s3-trigger.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-trigger
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: "my-event-bucket"
  - name: region
    value: "us-east-1"
  - name: direction
    value: "input"
```

## Handling Binding Events

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"
    dapr "github.com/dapr/go-sdk/client"
)

// Called when cron fires or S3 event arrives
func handleScheduledTrigger(w http.ResponseWriter, r *http.Request) {
    var event map[string]interface{}
    json.NewDecoder(r.Body).Decode(&event)

    // Start a Dapr workflow for each event
    client, _ := dapr.NewClient()
    defer client.Close()

    instanceID := fmt.Sprintf("process-%d", time.Now().UnixNano())
    client.StartWorkflowBeta1(r.Context(), &dapr.StartWorkflowRequest{
        InstanceID:        instanceID,
        WorkflowComponent: "dapr",
        WorkflowName:      "EventProcessingWorkflow",
        Input:             event,
    })

    w.WriteHeader(200)
}

func main() {
    http.HandleFunc("/scheduled-trigger", handleScheduledTrigger)
    http.HandleFunc("/s3-trigger", handleScheduledTrigger)
    http.ListenAndServe(":8080", nil)
}
```

## Event Processing Workflow

```go
func EventProcessingWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var event map[string]interface{}
    ctx.GetInput(&event)

    // Step 1: Validate and enrich
    var enrichedEvent EnrichedEvent
    if err := ctx.CallActivity(ValidateAndEnrich,
        workflow.ActivityInput(event)).Await(&enrichedEvent); err != nil {
        return nil, err
    }

    // Step 2: Transform
    var transformedData TransformedData
    if err := ctx.CallActivity(Transform,
        workflow.ActivityInput(enrichedEvent)).Await(&transformedData); err != nil {
        return nil, err
    }

    // Step 3: Load to destination
    if err := ctx.CallActivity(LoadToDestination,
        workflow.ActivityInput(transformedData)).Await(nil); err != nil {
        return nil, err
    }

    return map[string]any{"status": "processed"}, nil
}
```

## Output Binding: Write Results

```yaml
# components/warehouse-output.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: data-warehouse
spec:
  type: bindings.aws.kinesis
  version: v1
  metadata:
  - name: streamName
    value: "processed-events"
  - name: region
    value: "us-east-1"
  - name: direction
    value: "output"
  - name: partitionKey
    value: "eventId"
```

```go
func LoadToDestination(ctx workflow.ActivityContext) (any, error) {
    var data TransformedData
    ctx.GetInput(&data)

    client, _ := dapr.NewClient()
    defer client.Close()

    payload, _ := json.Marshal(data)
    return nil, client.InvokeOutputBinding(ctx.Context(), &dapr.InvokeBindingRequest{
        Name:      "data-warehouse",
        Operation: "create",
        Data:      payload,
    })
}
```

## Auto-Scaling with KEDA

Scale your Dapr event processors based on queue depth:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: event-processor-scaler
spec:
  scaleTargetRef:
    name: event-processor
  minReplicaCount: 0
  maxReplicaCount: 50
  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/123456789/events
      queueLength: "10"
      awsRegion: us-east-1
```

Scale to zero when idle and up to 50 replicas under load.

## Summary

Dapr enables serverless event processing on Kubernetes using input bindings as event triggers, workflows for reliable multi-step processing, and output bindings for result delivery. Combine with KEDA for zero-to-N autoscaling based on queue depth. This pattern delivers serverless economics (scale to zero) with the durability guarantees of Dapr Workflow, making it suitable for critical event pipelines that cannot afford message loss.
