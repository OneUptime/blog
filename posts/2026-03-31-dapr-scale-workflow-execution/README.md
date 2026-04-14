# How to Scale Dapr Workflow Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Scalability, Kubernetes, Orchestration

Description: Scale Dapr Workflow execution horizontally by configuring concurrency limits, worker counts, and state store performance for high-throughput orchestration.

---

## Dapr Workflow Scaling Model

Dapr Workflow is built on the Durable Task Framework. Each workflow instance runs as a series of orchestrator and activity tasks. Scaling is controlled by the number of worker pods, concurrency settings, and the throughput of the underlying state store.

## Workflow Worker Configuration

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<OrderProcessingWorkflow>();
    options.RegisterActivity<ValidateOrderActivity>();
    options.RegisterActivity<ChargePaymentActivity>();
    options.RegisterActivity<FulfillOrderActivity>();
    options.RegisterActivity<SendNotificationActivity>();
});

var app = builder.Build();
app.Run();
```

Workflow concurrency is controlled at the Dapr sidecar level using the `dapr.io/app-max-concurrency` annotation on the pod, not in application code. Set this in your Kubernetes deployment annotations to limit how many concurrent requests the sidecar delivers to each worker pod.

## Deployment for Workflow Workers

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: workflow-worker
  template:
    metadata:
      labels:
        app: workflow-worker
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "workflow-worker"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: workflow-worker
        image: myregistry/workflow-worker:latest
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
```

## High-Performance State Store for Workflows

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: workflow-statestore
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: pg-secret
      key: connectionString
  - name: actorStateStore
    value: "true"
  - name: tableName
    value: "dapr_workflow_state"
  - name: connectionMaxIdleTime
    value: "0"
```

## Starting Workflows at High Rate

```python
import asyncio
import aiohttp

DAPR_PORT = 3500

async def start_workflow(session: aiohttp.ClientSession, instance_id: str, payload: dict):
    url = f"http://localhost:{DAPR_PORT}/v1.0/workflows/dapr/OrderProcessingWorkflow/start?instanceID={instance_id}"
    async with session.post(url, json=payload) as resp:
        return await resp.json()

async def start_workflow_batch(orders: list[dict], concurrency: int = 200):
    connector = aiohttp.TCPConnector(limit=concurrency)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            start_workflow(session, f"order-{o['orderId']}", o)
            for o in orders
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)
```

## HPA for Workflow Workers

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workflow-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workflow-worker
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65
```

## Monitoring Workflow Throughput

```bash
# Check status of a specific workflow instance
curl "http://localhost:3500/v1.0/workflows/dapr/order-12345" | jq '.runtimeStatus'

# Use the Dapr CLI to list workflow instances
dapr workflow list --workflow-component dapr
```

## Summary

Dapr Workflow scales by adding worker pods, each running with configurable concurrency limits for orchestrators and activities. The bottleneck is usually the state store - PostgreSQL or a comparable durable store performs better than Redis for workflow state due to transaction semantics. Use HPA based on CPU to scale workers automatically with load.
