# How to Use Dapr KubeMQ Binding for Message Queuing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, KubeMQ, Message Queue, Kubernetes

Description: Learn how to configure the Dapr KubeMQ binding to send and receive messages from KubeMQ queues and channels in a Kubernetes-native messaging environment.

---

## Overview of KubeMQ with Dapr

KubeMQ is a Kubernetes-native message broker that provides queues, pub/sub, and RPC channels. The Dapr KubeMQ binding integrates KubeMQ queues into Dapr's binding API, allowing any service to enqueue and dequeue messages through a uniform interface.

## Install KubeMQ on Kubernetes

```bash
# Install KubeMQ operator
kubectl apply -f https://deploy.kubemq.io/init

# Deploy KubeMQ cluster
kubectl apply -f - <<EOF
apiVersion: core.k8s.kubemq.io/v1alpha1
kind: KubemqCluster
metadata:
  name: kubemq-cluster
  namespace: kubemq
spec:
  replicas: 1
  license: ""  # Free tier
EOF
```

## Configure the KubeMQ Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubemq-binding
spec:
  type: bindings.kubemq
  version: v1
  metadata:
  - name: address
    value: kubemq-cluster-grpc.kubemq.svc.cluster.local:50000
  - name: channel
    value: task-queue
  - name: authToken
    secretKeyRef:
      name: kubemq-secret
      key: token
  - name: pollMaxItems
    value: "1"
  - name: pollTimeoutSeconds
    value: "3"
```

## Send a Message (Output Binding)

```bash
curl -X POST http://localhost:3500/v1.0/bindings/kubemq-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "taskId": "task-001",
      "type": "pdf-generation",
      "documentId": "doc-456"
    },
    "metadata": {
      "channel": "task-queue",
      "messageId": "msg-unique-001"
    }
  }'
```

## Receive Messages (Input Binding)

Dapr polls the KubeMQ queue and triggers your app endpoint:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/kubemq-binding", async (req, res) => {
  const task = req.body;
  console.log("Received task from KubeMQ:", task.taskId);

  try {
    await processTask(task);
    res.sendStatus(200);  // Acknowledge and remove from queue
  } catch (err) {
    console.error("Processing failed:", err.message);
    res.status(500).send();  // Requeue for retry
  }
});

app.listen(3000);
```

## Publishing to KubeMQ Events Channel

For pub/sub use cases, use the Dapr KubeMQ pub/sub component instead of the binding:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubemq-events
spec:
  type: pubsub.kubemq
  version: v1
  metadata:
  - name: address
    value: kubemq-cluster-grpc.kubemq.svc.cluster.local:50000
  - name: channel
    value: order.events
  - name: isStore
    value: "false"  # true for EventsStore (persisted), false for Events (in-memory)
```

## Application Code for Queue Operations

```python
import requests

class KubeMQClient:
    def __init__(self, dapr_port: int = 3500):
        self.base = f"http://localhost:{dapr_port}/v1.0/bindings/kubemq-binding"

    def send(self, task: dict, task_id: str):
        response = requests.post(
            self.base,
            json={
                "operation": "create",
                "data": task,
                "metadata": {
                    "channel": "task-queue",
                    "messageId": task_id,
                },
            },
        )
        response.raise_for_status()

client = KubeMQClient()
client.send(
    task={"type": "report", "reportId": "r-100"},
    task_id="report-task-r-100",
)
```

## Summary

The Dapr KubeMQ binding connects Dapr applications to KubeMQ queues and event channels. Configure the KubeMQ gRPC address and channel name in the component YAML, then use the create operation for sending and the input binding trigger for receiving. KubeMQ's Kubernetes-native deployment makes it a natural fit for cloud-native microservice architectures.
