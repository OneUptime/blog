# How to Implement Workflow History Cleanup in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, History, Cleanup, State Management

Description: Implement automated workflow history cleanup in Dapr to prevent unbounded state store growth by purging completed and failed workflow instances.

---

## Overview

Dapr Workflow persists full execution history for every workflow instance. Without cleanup, your state store grows continuously. This guide covers manual purging, batch purging via the API, and automating cleanup with Kubernetes CronJobs.

## Understanding Workflow History

Each workflow instance stores:
- Input and output data
- All activity inputs and outputs
- Event history (scheduling, starting, completing)
- Error details for failed steps

For long-running workflows with many activities, a single instance can store hundreds of KB.

## Purging a Single Workflow Instance

```bash
# Purge a completed workflow
curl -X DELETE \
  "http://localhost:3500/v1.0/workflows/dapr/order-workflow-123/purge"

# Check it's gone
curl "http://localhost:3500/v1.0/workflows/dapr/order-workflow-123/status"
# Returns 404
```

## Bulk Purge by Status and Date

```bash
# Purge all completed workflows older than 30 days
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/purge" \
  -H "Content-Type: application/json" \
  -d '{
    "createdTimeTo": "2026-03-01T00:00:00Z",
    "status": "COMPLETED"
  }'

# Purge failed workflows older than 7 days
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/purge" \
  -H "Content-Type: application/json" \
  -d '{
    "createdTimeTo": "2026-03-24T00:00:00Z",
    "status": "FAILED"
  }'
```

## Automated Cleanup with a Go Service

```go
package main

import (
    "fmt"
    "net/http"
    "time"
    "bytes"
    "encoding/json"
)

type PurgeRequest struct {
    CreatedTimeTo string `json:"createdTimeTo"`
    Status        string `json:"status"`
}

func purgeOldWorkflows(daprHost string, olderThan time.Duration, status string) error {
    cutoff := time.Now().Add(-olderThan).UTC().Format(time.RFC3339)

    payload, _ := json.Marshal(PurgeRequest{
        CreatedTimeTo: cutoff,
        Status:        status,
    })

    resp, err := http.Post(
        fmt.Sprintf("http://%s:3500/v1.0/workflows/dapr/purge", daprHost),
        "application/json",
        bytes.NewBuffer(payload),
    )
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    fmt.Printf("Purged %s workflows older than %v, status: %d\n",
        status, olderThan, resp.StatusCode)
    return nil
}

func main() {
    // Run cleanup
    purgeOldWorkflows("localhost", 30*24*time.Hour, "COMPLETED")
    purgeOldWorkflows("localhost", 7*24*time.Hour, "FAILED")
    purgeOldWorkflows("localhost", 24*time.Hour, "TERMINATED")
}
```

## Kubernetes CronJob for Automated Cleanup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dapr-workflow-cleanup
  namespace: default
spec:
  schedule: "0 3 * * *"   # Daily at 3am
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              CUTOFF=$(date -d '30 days ago' -u +%Y-%m-%dT%H:%M:%SZ)
              curl -X POST http://workflow-service:3500/v1.0/workflows/dapr/purge \
                -H "Content-Type: application/json" \
                -d "{\"createdTimeTo\": \"$CUTOFF\", \"status\": \"COMPLETED\"}"
          restartPolicy: OnFailure
```

## Monitoring State Store Size

```bash
# Redis memory usage
kubectl exec -it redis-0 -- redis-cli INFO memory | grep used_memory_human

# Count workflow keys
kubectl exec -it redis-0 -- redis-cli DBSIZE
```

## Summary

Dapr Workflow history accumulates in your state store and must be explicitly purged. Use the `/purge` API endpoint to bulk-delete completed, failed, and terminated workflows by date range. Automate cleanup with a daily Kubernetes CronJob, retaining completed workflows for 30 days and failed workflows for 7 days as a reasonable default policy for production environments.
