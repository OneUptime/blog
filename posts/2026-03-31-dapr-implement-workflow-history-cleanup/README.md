# How to Implement Workflow History Cleanup in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, History, Cleanup, State Management

Description: Implement automated workflow history cleanup in Dapr to prevent unbounded state store growth by purging completed and failed workflow instances.

---

## Overview

Dapr Workflow persists full execution history for every workflow instance. Without cleanup, your state store grows continuously. This guide covers manual purging, programmatic batch purging, and automating cleanup with Kubernetes CronJobs.

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
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/order-workflow-123/purge"

# Check it's gone
curl "http://localhost:3500/v1.0/workflows/dapr/order-workflow-123"
# Returns 404
```

## Purging Multiple Workflow Instances

Dapr does not provide a bulk purge API. To purge multiple workflows, iterate over known instance IDs and call the single-instance purge endpoint for each:

```bash
# Purge a list of completed workflows
for ID in order-001 order-002 order-003; do
  curl -s -X POST \
    "http://localhost:3500/v1.0/workflows/dapr/$ID/purge"
  echo " -> purged $ID"
done
```

Your application should track workflow instance IDs so cleanup scripts can reference them later.

## Automated Cleanup with a Go Service

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type WorkflowState struct {
    InstanceID    string `json:"instanceID"`
    RuntimeStatus string `json:"runtimeStatus"`
    CreatedAt     string `json:"createdAt"`
}

func getWorkflowStatus(daprHost, instanceID string) (*WorkflowState, error) {
    resp, err := http.Get(
        fmt.Sprintf("http://%s:3500/v1.0/workflows/dapr/%s", daprHost, instanceID),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusNotFound {
        return nil, nil
    }

    var state WorkflowState
    if err := json.NewDecoder(resp.Body).Decode(&state); err != nil {
        return nil, err
    }
    return &state, nil
}

func purgeWorkflow(daprHost, instanceID string) error {
    resp, err := http.Post(
        fmt.Sprintf("http://%s:3500/v1.0/workflows/dapr/%s/purge", daprHost, instanceID),
        "application/json",
        nil,
    )
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 300 {
        return fmt.Errorf("purge failed for %s: status %d", instanceID, resp.StatusCode)
    }
    return nil
}

func purgeOldWorkflows(daprHost string, instanceIDs []string, olderThan time.Duration, status string) {
    cutoff := time.Now().Add(-olderThan)

    for _, id := range instanceIDs {
        state, err := getWorkflowStatus(daprHost, id)
        if err != nil {
            fmt.Printf("Error checking %s: %v\n", id, err)
            continue
        }
        if state == nil {
            continue
        }
        if state.RuntimeStatus != status {
            continue
        }

        createdAt, err := time.Parse(time.RFC3339, state.CreatedAt)
        if err != nil {
            fmt.Printf("Error parsing time for %s: %v\n", id, err)
            continue
        }

        if createdAt.Before(cutoff) {
            if err := purgeWorkflow(daprHost, id); err != nil {
                fmt.Printf("Error purging %s: %v\n", id, err)
            } else {
                fmt.Printf("Purged %s (status: %s, created: %s)\n", id, status, state.CreatedAt)
            }
        }
    }
}

func main() {
    // Your app should track workflow instance IDs (e.g., in a database).
    instanceIDs := []string{
        "order-workflow-001",
        "order-workflow-002",
        "order-workflow-003",
    }

    purgeOldWorkflows("localhost", instanceIDs, 30*24*time.Hour, "COMPLETED")
    purgeOldWorkflows("localhost", instanceIDs, 7*24*time.Hour, "FAILED")
    purgeOldWorkflows("localhost", instanceIDs, 24*time.Hour, "TERMINATED")
}
```

## Kubernetes CronJob for Automated Cleanup

Build the Go cleanup service above into a container image and schedule it with a CronJob. The Dapr sidecar annotation ensures the job can access the workflow API:

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
        metadata:
          annotations:
            dapr.io/enabled: "true"
            dapr.io/app-id: "workflow-cleanup"
        spec:
          containers:
          - name: cleanup
            image: myregistry/workflow-cleanup:latest
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

Dapr Workflow history accumulates in your state store and must be explicitly purged. Use the per-instance purge endpoint (`POST /v1.0/workflows/dapr/{instanceId}/purge`) to delete completed, failed, and terminated workflow instances. Automate cleanup with a daily Kubernetes CronJob running a Go service that checks each workflow's status and age before purging, retaining completed workflows for 30 days and failed workflows for 7 days as a reasonable default policy for production environments.
