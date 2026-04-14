# How to Implement Point-to-Point Messaging with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Messaging, Point-to-Point, Queue, Microservice

Description: Learn how to implement point-to-point messaging with Dapr so each published message is consumed by exactly one subscriber instance using competing consumers.

---

Point-to-point messaging ensures that each message is processed by exactly one consumer, even when multiple instances of a subscriber are running. Dapr achieves this through consumer groups - multiple instances of the same service share a consumer group ID, so only one instance processes each message.

## How Point-to-Point Works in Dapr

When multiple instances of the same service (same `appID`) subscribe to a topic, they form a competing consumer group. The broker delivers each message to only one instance, enabling load-balanced message processing.

## Pub/Sub Component - Using Kafka for Strong Guarantees

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub-p2p
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker:9092"
  - name: authType
    value: "none"
```

## Publisher - Task Dispatcher

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
)

type Task struct {
    TaskID   string `json:"taskId"`
    Type     string `json:"type"`
    Payload  string `json:"payload"`
}

func dispatchTask(task Task) error {
    data, _ := json.Marshal(task)
    resp, err := http.Post(
        "http://localhost:3500/v1.0/publish/pubsub-p2p/tasks",
        "application/json",
        strings.NewReader(string(data)),
    )
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    fmt.Printf("Dispatched task %s\n", task.TaskID)
    return nil
}

func main() {
    for i := 1; i <= 10; i++ {
        dispatchTask(Task{
            TaskID:  fmt.Sprintf("TASK-%03d", i),
            Type:    "email",
            Payload: fmt.Sprintf("user%d@example.com", i),
        })
    }
}
```

## Worker Service - Competing Consumer

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
)

type Task struct {
    TaskID  string `json:"taskId"`
    Type    string `json:"type"`
    Payload string `json:"payload"`
}

func main() {
    workerID := os.Getenv("WORKER_ID")

    http.HandleFunc("/dapr/subscribe", func(w http.ResponseWriter, r *http.Request) {
        subs := []map[string]string{{"pubsubname": "pubsub-p2p", "topic": "tasks", "route": "/tasks"}}
        json.NewEncoder(w).Encode(subs)
    })

    http.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {
        var task Task
        json.NewDecoder(r.Body).Decode(&task)
        fmt.Printf("Worker %s processing task %s (type: %s)\n", workerID, task.TaskID, task.Type)
        // Only this one worker processes this message
        w.Header().Set("Content-Type", "application/json")
        fmt.Fprint(w, `{"status":"SUCCESS"}`)
    })

    log.Fatal(http.ListenAndServe(":5001", nil))
}
```

## Deploying Multiple Worker Instances

```bash
# Run worker instance 1
WORKER_ID=worker-1 dapr run --app-id task-worker --app-port 5001 -- go run worker.go

# Run worker instance 2 (same appID - competes for messages)
WORKER_ID=worker-2 dapr run --app-id task-worker --app-port 5002 -- go run worker.go
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-worker
  template:
    metadata:
      labels:
        app: task-worker
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "task-worker"
        dapr.io/app-port: "5001"
    spec:
      containers:
      - name: task-worker
        image: myrepo/task-worker:latest
        ports:
        - containerPort: 5001
```

## Summary

Dapr implements point-to-point messaging through consumer groups - when multiple instances share the same app ID, the broker delivers each message to exactly one instance. This pattern enables horizontal scaling of workers while guaranteeing each task is processed once. Use Kafka or RabbitMQ for strong ordering and delivery guarantees in production.
