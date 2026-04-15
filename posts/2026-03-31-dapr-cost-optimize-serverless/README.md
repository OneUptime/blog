# How to Cost Optimize Dapr Serverless Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Serverless, Cost, Optimization, Kubernetes, Resource

Description: Practical strategies to reduce the infrastructure cost of Dapr serverless deployments by right-sizing sidecars, tuning autoscaling, and reducing unnecessary API calls.

---

## The Cost Profile of Dapr Serverless

Every Dapr-enabled pod runs a sidecar container that consumes CPU and memory alongside your application. In serverless or burstable workloads, over-provisioned sidecars and chatty state store calls drive unnecessary spend. The key levers are: sidecar resource limits, replica scaling boundaries, trace sampling rates, and batching of state/pub-sub operations.

## Right-Sizing Sidecar Resources

Default Dapr sidecar resource requests are often generous. Tune them based on observed usage:

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "50m"
  dapr.io/sidecar-memory-request: "64Mi"
  dapr.io/sidecar-cpu-limit: "200m"
  dapr.io/sidecar-memory-limit: "256Mi"
```

For high-concurrency services, measure peak memory under load:

```bash
kubectl top pod -l app=my-service --containers
# NAME                  CONTAINER        CPU   MEMORY
# my-service-abc123     my-service       45m   110Mi
# my-service-abc123     daprd            38m    72Mi
```

## Tuning KEDA Autoscaling

Use KEDA with Dapr pub/sub to scale to zero when idle:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-service-scaler
spec:
  scaleTargetRef:
    name: my-service
  minReplicaCount: 0
  maxReplicaCount: 10
  cooldownPeriod: 60
  triggers:
    - type: redis
      metadata:
        address: redis-master:6379
        listName: "my-service-queue"
        listLength: "5"
```

## Reducing Trace Sampling Cost

Full tracing to a managed observability backend can double your egress bill. Tail-sample at the collector instead:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: cost-optimized
spec:
  tracing:
    samplingRate: "0.01"
```

Then apply tail-sampling at the OpenTelemetry Collector:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors-policy
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: slow-policy
        type: latency
        latency: {threshold_ms: 500}
```

## Batching State Writes

Each individual state write is a billable API call on managed backends. Batch writes together:

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateItem

def flush_batch(items: list[dict]):
    with DaprClient() as client:
        state_items = [
            StateItem(key=item["key"], value=item["value"])
            for item in items
        ]
        # One call instead of N
        client.save_bulk_state(store_name="statestore", states=state_items)
```

## Disabling Unused Components

Remove component manifests that are not used - Dapr still initializes and maintains connections for all deployed components:

```bash
# List all active components
kubectl get components -n production

# Delete unused ones
kubectl delete component unused-secretstore -n production
kubectl delete component legacy-binding -n production
```

## Scheduled Scale-Down

For non-production environments, use a CronJob to scale deployments to zero overnight:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-staging
spec:
  schedule: "0 20 * * 1-5"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: kubectl
              image: bitnami/kubectl
              command:
                - kubectl
                - scale
                - deploy
                - --replicas=0
                - -l
                - environment=staging
```

## Summary

Cost-optimizing Dapr serverless deployments starts with right-sizing sidecar resource requests based on observed metrics, enabling scale-to-zero with KEDA, and reducing trace sampling to 1% or less with tail-sampling for errors. Batching state operations and removing unused component manifests further reduce both egress costs and sidecar initialization overhead. Applying all these strategies together typically yields 30-50% cost reduction in variable-traffic workloads.
