# How to Build a File Processing Pipeline with Dapr Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, File Processing, Pipeline, S3

Description: Learn how to build a file processing pipeline using Dapr input and output bindings to trigger processing on file uploads and store results automatically.

---

## Overview

File processing pipelines ingest uploaded files, transform them, and store results. Dapr bindings abstract file storage (S3, Azure Blob, GCS) and message queues, letting you build pipelines that trigger on file events without vendor-specific SDK code.

## Binding Configuration

The Dapr S3 binding is output-only — it supports operations like `get`, `create`, `list`, and `delete`, but cannot trigger on file uploads directly. To build an event-driven pipeline, configure S3 to send upload notifications to an SQS queue, then use a Dapr SQS input binding to trigger processing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-source
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "uploads-bucket"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secret
        key: accessKeyId
    - name: secretKey
      secretKeyRef:
        name: aws-secret
        key: secretAccessKey
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-output
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "processed-bucket"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secret
        key: accessKeyId
    - name: secretKey
      secretKeyRef:
        name: aws-secret
        key: secretAccessKey
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-notifications
spec:
  type: bindings.aws.sqs
  version: v1
  metadata:
    - name: queueURL
      value: "https://sqs.us-east-1.amazonaws.com/123456789012/s3-upload-notifications"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secret
        key: accessKeyId
    - name: secretKey
      secretKeyRef:
        name: aws-secret
        key: secretAccessKey
    - name: direction
      value: "input"
```

## File Processing Service

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "path/filepath"

    dapr "github.com/dapr/go-sdk/client"
    common "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
)

type FileProcessor struct {
    daprClient dapr.Client
}

type S3Event struct {
    Bucket string `json:"bucket"`
    Key    string `json:"key"`
    Size   int64  `json:"size"`
    ETag   string `json:"eTag"`
}

func main() {
    client, _ := dapr.NewClient()
    processor := &FileProcessor{daprClient: client}

    s := daprd.NewService(":8080")
    s.AddBindingInvocationHandler("s3-notifications", processor.processFile)
    if err := s.Start(); err != nil {
        panic(err)
    }
}

func (fp *FileProcessor) processFile(ctx context.Context, in *common.BindingEvent) ([]byte, error) {
    // Parse S3 event notification delivered via SQS
    var notification struct {
        Records []struct {
            S3 struct {
                Bucket struct {
                    Name string `json:"name"`
                } `json:"bucket"`
                Object struct {
                    Key  string `json:"key"`
                    Size int64  `json:"size"`
                    ETag string `json:"eTag"`
                } `json:"object"`
            } `json:"s3"`
        } `json:"Records"`
    }
    json.Unmarshal(in.Data, &notification)

    if len(notification.Records) == 0 {
        return []byte(`{"status":"skipped","reason":"no records"}`), nil
    }

    record := notification.Records[0].S3
    event := S3Event{
        Bucket: record.Bucket.Name,
        Key:    record.Object.Key,
        Size:   record.Object.Size,
        ETag:   record.Object.ETag,
    }

    ext := filepath.Ext(event.Key)

    switch ext {
    case ".csv":
        return fp.processCSV(ctx, event)
    case ".jpg", ".jpeg", ".png":
        return fp.processImage(ctx, event)
    case ".pdf":
        return fp.processPDF(ctx, event)
    default:
        return []byte(`{"status":"skipped","reason":"unsupported file type"}`), nil
    }
}
```

## CSV Processing

```go
func (fp *FileProcessor) processCSV(ctx context.Context, event S3Event) ([]byte, error) {
    // Download file via S3 binding
    fileData, err := fp.daprClient.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "s3-source",
        Operation: "get",
        Metadata:  map[string]string{"key": event.Key},
    })
    if err != nil {
        return nil, err
    }

    // Parse and transform CSV
    records := parseCSV(fileData.Data)
    result := transformRecords(records)

    // Save processed result
    resultJSON, _ := json.Marshal(result)
    outputKey := "processed/" + event.Key[:len(event.Key)-4] + ".json"

    _, err = fp.daprClient.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "s3-output",
        Operation: "create",
        Data:      resultJSON,
        Metadata:  map[string]string{"key": outputKey},
    })
    if err != nil {
        return nil, err
    }

    // Publish completion event
    fp.daprClient.PublishEvent(ctx, "pubsub", "file-processed", map[string]string{
        "inputKey":    event.Key,
        "outputKey":   outputKey,
        "recordCount": fmt.Sprintf("%d", len(records)),
    })

    return []byte(`{"status":"completed"}`), nil
}
```

## Image Processing

```go
func (fp *FileProcessor) processImage(ctx context.Context, event S3Event) ([]byte, error) {
    // Get image bytes
    fileResp, _ := fp.daprClient.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "s3-source",
        Operation: "get",
        Metadata:  map[string]string{"key": event.Key},
    })

    imgData := fileResp.Data
    // Generate thumbnail
    thumbnail := generateThumbnail(imgData, 200, 200)

    thumbKey := "thumbnails/" + filepath.Base(event.Key)
    fp.daprClient.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "s3-output",
        Operation: "create",
        Data:      thumbnail,
        Metadata: map[string]string{
            "key":         thumbKey,
            "contentType": "image/jpeg",
        },
    })

    return []byte(`{"status":"completed","thumbnail":"` + thumbKey + `"}`), nil
}
```

## Async Pipeline with Pub/Sub

For long-running jobs, use pub/sub to chain pipeline stages:

```go
// Stage 1: Download and validate
func downloadStage(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var event S3Event
    json.Unmarshal(e.RawData, &event)

    valid, err := validateFile(event)
    if err != nil || !valid {
        daprClient.PublishEvent(ctx, "pubsub", "file-validation-failed", event)
        return false, nil
    }
    return false, daprClient.PublishEvent(ctx, "pubsub", "file-validated", event)
}

// Stage 2: Transform
func transformStage(ctx context.Context, e *common.TopicEvent) (bool, error) {
    // ... transform logic
    return false, daprClient.PublishEvent(ctx, "pubsub", "file-transformed", event)
}
```

## Summary

Dapr bindings provide a vendor-agnostic interface to object storage and event triggers for file processing pipelines. Since the S3 binding is output-only, S3 upload notifications are routed through an SQS input binding to trigger processing. S3 output bindings handle reading source files and storing results, while pub/sub chains pipeline stages asynchronously. This architecture handles CSV, image, and PDF processing without AWS SDK or S3 client imports in your business logic code.
