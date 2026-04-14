# How to Implement Priority Queue with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Priority Queue, Pub/Sub, Pattern, Workflow

Description: Learn how to implement a priority queue with Dapr using multiple topics or Dapr Workflow to process high-priority messages before lower-priority ones.

---

## Overview

A priority queue processes higher-priority items before lower-priority ones. Dapr doesn't have a native priority queue, but you can implement one using multiple topics with dedicated consumers, or by using Dapr Workflow to schedule work based on priority.

## Approach 1: Multiple Priority Topics

Create separate topics for each priority level:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: priority-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: consumerGroup
      value: "task-processors"
```

### Publishing with Priority

```go
package main

import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

type Priority int

const (
    PriorityLow    Priority = 1
    PriorityMedium Priority = 2
    PriorityHigh   Priority = 3
    PriorityCritical Priority = 4
)

type Task struct {
    ID       string   `json:"id"`
    Type     string   `json:"type"`
    Payload  string   `json:"payload"`
    Priority Priority `json:"priority"`
}

func publishTask(client dapr.Client, task Task) error {
    // Route to priority-specific topic
    topic := fmt.Sprintf("tasks-priority-%d", task.Priority)
    return client.PublishEvent(context.Background(), "priority-pubsub", topic, task)
}
```

### Priority Consumer with Ordered Processing

```go
type PriorityConsumer struct {
    client    dapr.Client
    semaphore chan struct{}  // Limit concurrent processing
}

func NewPriorityConsumer(maxConcurrency int) *PriorityConsumer {
    return &PriorityConsumer{
        semaphore: make(chan struct{}, maxConcurrency),
    }
}

// High priority handler - always processes immediately
func (pc *PriorityConsumer) handleCritical(ctx context.Context, e *common.TopicEvent) (bool, error) {
    return pc.processTask(ctx, e, true)
}

// Lower priority handler - waits for capacity
func (pc *PriorityConsumer) handleLow(ctx context.Context, e *common.TopicEvent) (bool, error) {
    select {
    case pc.semaphore <- struct{}{}:
        defer func() { <-pc.semaphore }()
        return pc.processTask(ctx, e, false)
    case <-time.After(5 * time.Second):
        return true, fmt.Errorf("no capacity, retrying later")
    }
}

func (pc *PriorityConsumer) processTask(ctx context.Context, e *common.TopicEvent, urgent bool) (bool, error) {
    var task Task
    json.Unmarshal(e.RawData, &task)
    log.Printf("Processing %s task %s (urgent=%v)", task.Type, task.ID, urgent)
    return false, doWork(ctx, task)
}
```

## Approach 2: Priority Queue with Dapr State

```go
type PriorityQueueStore struct {
    client dapr.Client
}

func (pq *PriorityQueueStore) Enqueue(ctx context.Context, task Task) error {
    key := fmt.Sprintf("queue:p%d:%s:%s", task.Priority, time.Now().Format(time.RFC3339Nano), task.ID)
    data, _ := json.Marshal(task)
    return pq.client.SaveState(ctx, "statestore", key, data, nil)
}

func (pq *PriorityQueueStore) DequeueNext(ctx context.Context) (*Task, error) {
    // Try priorities from highest to lowest
    for priority := 4; priority >= 1; priority-- {
        task, err := pq.dequeueFromPriority(ctx, priority)
        if err == nil && task != nil {
            return task, nil
        }
    }
    return nil, nil
}
```

## Approach 3: Priority with Dapr Workflow

```go
func PriorityDispatcherWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var task Task
    ctx.GetInput(&task)

    // Critical tasks: immediate processing
    if task.Priority == PriorityCritical {
        return ctx.CallActivity(ProcessTask, workflow.WithActivityInput(task)).Await(nil)
    }

    // High priority: small delay
    if task.Priority == PriorityHigh {
        ctx.CreateTimer(2 * time.Second).Await(nil)
        return ctx.CallActivity(ProcessTask, workflow.WithActivityInput(task)).Await(nil)
    }

    // Low priority: wait for off-peak hours
    ctx.CreateTimer(30 * time.Minute).Await(nil)
    return ctx.CallActivity(ProcessTask, workflow.WithActivityInput(task)).Await(nil)
}
```

## Deployment with Replica Weighting

Allocate more consumers to higher-priority topics:

```bash
# Deploy more replicas for high-priority processing
kubectl scale deployment priority-consumer-high --replicas=5
kubectl scale deployment priority-consumer-medium --replicas=3
kubectl scale deployment priority-consumer-low --replicas=1
```

## Summary

Dapr implements priority queues through multiple pub/sub topics with dedicated consumer pools or through workflow-based scheduling delays. Assigning more replicas to high-priority topics ensures faster processing for critical work while lower-priority tasks are processed as capacity allows. The Dapr Workflow approach adds time-based priority scheduling for use cases requiring delayed processing.
