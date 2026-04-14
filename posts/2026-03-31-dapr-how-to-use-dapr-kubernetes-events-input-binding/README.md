# How to Use Dapr Kubernetes Events Input Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Event, Binding, Observability

Description: Learn how to use the Dapr Kubernetes Events input binding to react to Kubernetes cluster events from your microservices in real time.

---

## What Is the Dapr Kubernetes Events Input Binding

The Dapr Kubernetes Events input binding allows your application to receive Kubernetes events (pod restarts, deployment updates, node issues, etc.) as HTTP triggers through the Dapr sidecar. Instead of polling the Kubernetes API or writing a custom controller, your service simply exposes an endpoint and Dapr streams events to it.

## Prerequisites

- Dapr installed on a Kubernetes cluster
- A service account with permission to read Kubernetes events
- Basic familiarity with Dapr bindings and Kubernetes RBAC

## Configure RBAC for Event Access

Create a ClusterRole and binding so Dapr can read events:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dapr-event-reader
rules:
- apiGroups: [""]
  resources: ["events"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dapr-event-reader-binding
subjects:
- kind: ServiceAccount
  name: default
  namespace: default
roleRef:
  kind: ClusterRole
  name: dapr-event-reader
  apiGroup: rbac.authorization.k8s.io
```

Apply the RBAC:

```bash
kubectl apply -f rbac.yaml
```

## Define the Kubernetes Events Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: k8s-events
  namespace: default
spec:
  type: bindings.kubernetes
  version: v1
  metadata:
  - name: namespace
    value: "default"
  - name: resyncPeriodInSec
    value: "10"
```

The `namespace` field is required and specifies which namespace to watch for events.

## Handle Kubernetes Events in Your Application

Dapr sends HTTP POST requests to an endpoint matching the component name (`/k8s-events`) in your application. The payload is wrapped in an envelope with `event` (the action type: `add`, `update`, or `delete`), `newVal` (the new Kubernetes Event object), and `oldVal` (the previous Kubernetes Event object):

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/k8s-events', (req, res) => {
  const { event: action, newVal, oldVal } = req.body;
  // action is "add", "update", or "delete"
  // For "add"/"update", the event data is in newVal
  // For "delete", the event data is in oldVal
  const k8sEvent = action === 'delete' ? oldVal : newVal;

  console.log('Kubernetes Event received:');
  console.log('  Action:', action);
  console.log('  Type:', k8sEvent.type);
  console.log('  Reason:', k8sEvent.reason);
  console.log('  Message:', k8sEvent.message);
  console.log('  Object:', k8sEvent.involvedObject?.name);
  console.log('  Namespace:', k8sEvent.involvedObject?.namespace);

  handleKubernetesEvent(k8sEvent);

  res.status(200).send('OK');
});

function handleKubernetesEvent(event) {
  if (event.type === 'Warning') {
    console.warn(`[WARNING] ${event.reason}: ${event.message}`);
    // send alert, update dashboard, etc.
  }

  if (event.reason === 'OOMKilling') {
    handleOOMKillEvent(event);
  }

  if (event.reason === 'BackOff') {
    handleCrashLoopEvent(event);
  }
}

function handleOOMKillEvent(event) {
  const podName = event.involvedObject?.name;
  console.error(`OOMKill detected on pod: ${podName}`);
  // notify ops team, scale up memory, etc.
}

function handleCrashLoopEvent(event) {
  const podName = event.involvedObject?.name;
  const count = event.count;
  console.warn(`CrashLoop on ${podName}, count: ${count}`);
}

app.listen(3000);
```

## Python Handler Example

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/k8s-events")
async def handle_k8s_event(request: Request):
    payload = await request.json()

    action = payload.get('event', '')  # "add", "update", or "delete"
    new_val = payload.get('newVal', {})
    old_val = payload.get('oldVal', {})

    # For "add"/"update", event data is in newVal; for "delete", it's in oldVal
    event = old_val if action == 'delete' else new_val

    event_type = event.get('type', '')
    reason = event.get('reason', '')
    message = event.get('message', '')
    obj = event.get('involvedObject', {})
    obj_name = obj.get('name', '')
    obj_kind = obj.get('kind', '')
    namespace = obj.get('namespace', '')

    print(f"[{action}] [{event_type}] {obj_kind}/{obj_name} in {namespace}: {reason} - {message}")

    if event_type == 'Warning':
        await process_warning_event(event)

    return {"status": "processed"}

async def process_warning_event(event):
    reason = event.get('reason', '')
    message = event.get('message', '')

    if reason in ['OOMKilling', 'Evicted', 'BackOff']:
        print(f"Critical event: {reason} - {message}")
        # trigger alert or remediation action
```

## Kubernetes Event Structure

The Dapr binding delivers events in a wrapper envelope. Here is a typical payload received by your handler:

```json
{
  "event": "add",
  "oldVal": {},
  "newVal": {
    "apiVersion": "v1",
    "kind": "Event",
    "type": "Warning",
    "reason": "BackOff",
    "message": "Back-off restarting failed container",
    "count": 5,
    "firstTimestamp": "2026-03-31T10:00:00Z",
    "lastTimestamp": "2026-03-31T10:05:00Z",
    "involvedObject": {
      "kind": "Pod",
      "name": "my-app-6d8f9-xk2lp",
      "namespace": "default"
    },
    "source": {
      "component": "kubelet",
      "host": "node-1"
    }
  }
}
```

The `event` field indicates the action (`add`, `update`, or `delete`). For `add` events, the Kubernetes Event data is in `newVal`. For `delete` events, it is in `oldVal`. For `update` events, both `oldVal` and `newVal` are populated.

## Filter Events by Reason

Process only critical event types:

```javascript
const CRITICAL_REASONS = new Set([
  'OOMKilling', 'Evicted', 'BackOff', 'Failed',
  'FailedMount', 'FailedScheduling', 'NodeNotReady',
]);

app.post('/k8s-events', (req, res) => {
  const { event: action, newVal, oldVal } = req.body;
  const k8sEvent = action === 'delete' ? oldVal : newVal;
  if (CRITICAL_REASONS.has(k8sEvent.reason)) {
    sendAlertToSlack(k8sEvent);
  }
  res.status(200).send('OK');
});
```

## Summary

The Dapr Kubernetes Events input binding provides a simple way to react to cluster events by triggering your application's HTTP endpoint when events occur. With a component YAML and an HTTP handler, your service can monitor pod crashes, OOM kills, scheduling failures, and other Kubernetes events without building a custom controller or polling the Kubernetes API directly.
