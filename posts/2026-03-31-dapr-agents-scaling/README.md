# How to Scale AI Agents with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Scaling, Kubernetes, Horizontal Pod Autoscaler

Description: Learn how to horizontally scale Dapr AI agents using Kubernetes HPA, KEDA event-driven autoscaling, and Dapr's actor distribution for load balancing.

---

## Scaling Challenges for AI Agents

AI agents have unique scaling requirements:

- LLM calls have high latency and variable duration
- Agent state must be accessible regardless of which pod handles a request
- Queue depth (not CPU) is often the right scaling signal
- Actor-based agents need stable routing to their designated pod

Dapr's architecture addresses all of these with built-in state management, pub/sub, and the virtual actor model.

## Horizontal Pod Autoscaling on CPU/Memory

For stateless HTTP-based agents, standard Kubernetes HPA works:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: research-agent-hpa
  namespace: ai-agents
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: research-agent
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

## KEDA Scaling on Queue Depth

For agents that process pub/sub tasks, KEDA provides event-driven autoscaling. Scale based on Redis list length:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: analysis-agent-scaledobject
  namespace: ai-agents
spec:
  scaleTargetRef:
    name: analysis-agent
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
    - type: redis
      metadata:
        address: redis.default.svc.cluster.local:6379
        listName: analysis-tasks
        listLength: "5"
        activationListLength: "1"
```

With this configuration, one pod handles up to 5 tasks. When the queue has 50 tasks, KEDA scales to 10 pods.

## Scaling Actor-Based Agents

Dapr actors distribute automatically across pods. Each actor instance is assigned to exactly one pod. As you scale up pods, Dapr rebalances actors:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resumable-agent
spec:
  replicas: 5  # Dapr distributes actor instances across all 5 pods
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "resumable-agent"
```

Dapr's placement service handles routing - clients always reach the correct pod for a given actor ID without extra configuration.

## Configuring Scheduler-Based Actor Reminders

Offload actor reminders to the Dapr Scheduler service for improved scalability:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: actor-config
spec:
  features:
    - name: SchedulerReminders
      enabled: true
```

## Load Testing Your Scaled Agents

Use `hey` to load test your agents via the Dapr sidecar:

```bash
# Install hey (HTTP load testing)
brew install hey

# Send 1000 requests with 50 concurrent connections
hey -n 1000 -c 50 \
  -m POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze this data"}' \
  http://localhost:3500/v1.0/invoke/analysis-agent/method/run
```

## Monitoring Scale Events

Configure Prometheus metrics to observe scaling:

```bash
# Check current replica count
kubectl get hpa -n ai-agents

# Watch scaling events
kubectl get events -n ai-agents --sort-by='.metadata.creationTimestamp' | grep -i scale
```

## Setting Concurrency Limits per Pod

Prevent a single agent pod from overwhelming LLM rate limits:

```python
from fastapi import FastAPI
import asyncio

app = FastAPI()
semaphore = asyncio.Semaphore(5)  # Max 5 concurrent LLM calls per pod

@app.post("/run")
async def run_agent(request: dict):
    async with semaphore:
        result = await agent.run_async(request["message"])
        return {"result": result}
```

## Summary

Scale Dapr Agents using Kubernetes HPA for CPU/memory-based scaling, KEDA for queue-depth autoscaling on pub/sub topics, or the Dapr actor model for automatic distribution of stateful agents. Add concurrency limits per pod to prevent LLM rate limit exhaustion, and monitor scaling events via Kubernetes events and Prometheus metrics.
