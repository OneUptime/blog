# How to Reduce Dapr Infrastructure Costs on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cost, Kubernetes, Optimization, Infrastructure

Description: Reduce Dapr infrastructure costs on Kubernetes by right-sizing sidecars, consolidating components, using spot instances, and eliminating idle resource waste.

---

## The Cost Profile of a Dapr Deployment

A Dapr deployment incurs costs across several dimensions:
- Sidecar containers in every enabled pod
- Control plane pods (operator, sentry, placement, dashboard)
- Backend infrastructure (Redis, Kafka, databases)
- Network egress for inter-service communication

Targeting each of these areas provides meaningful cost reduction.

## 1 - Audit and Remove Unused Components

Each loaded component uses memory. Audit which components are actually used:

```bash
# List all components and their types
kubectl get components -A -o custom-columns="NS:.metadata.namespace,NAME:.metadata.name,TYPE:.spec.type"

# Check sidecar logs to see which are loaded
kubectl logs my-pod -c daprd | grep "component loaded"
```

Remove unused components and use scoping to prevent unnecessary loading:

```yaml
# Scope expensive components to only the apps that need them
scopes:
- billing-api
- audit-service
```

## 2 - Reduce Sidecar Overhead for Low-Traffic Services

For background workers and low-traffic services, minimize sidecar resources:

```yaml
annotations:
  dapr.io/sidecar-cpu-request: "10m"
  dapr.io/sidecar-cpu-limit: "100m"
  dapr.io/sidecar-memory-request: "32Mi"
  dapr.io/sidecar-memory-limit: "64Mi"
```

Also disable unused features:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: low-overhead-config
spec:
  tracing:
    samplingRate: "0"
  metrics:
    enabled: false
```

## 3 - Scale Down the Dapr Dashboard

The dashboard is useful for development but unnecessary in production:

```bash
kubectl scale deployment dapr-dashboard -n dapr-system --replicas=0
# Or set replicas to 0 in Helm values
```

## 4 - Consolidate Control Plane Resources

In non-production environments, reduce control plane replicas:

```yaml
# development-values.yaml
global:
  ha:
    enabled: false

dapr_operator:
  replicaCount: 1
dapr_sentry:
  replicaCount: 1
```

```bash
helm upgrade dapr dapr/dapr -n dapr-system -f development-values.yaml
```

## 5 - Enable Pod Disruption Budgets for Spot Instances

Use spot/preemptible instances for non-critical Dapr workloads to save 60-80% on compute:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: orders-api-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: orders-api
```

Combined with a node selector for spot nodes:

```yaml
nodeSelector:
  node.kubernetes.io/lifecycle: spot
tolerations:
- key: "spot"
  operator: "Equal"
  value: "true"
  effect: "NoSchedule"
```

## 6 - Analyze Cost Savings

Track cost reduction using Kubecost or similar tooling:

```bash
# Install Kubecost
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace

# Query sidecar cost
kubectl port-forward svc/kubecost-cost-analyzer 9090:9090 -n kubecost
curl "http://localhost:9090/model/allocation?window=30d&aggregate=container&filter=container:daprd"
```

## Summary

Reducing Dapr infrastructure costs on Kubernetes involves auditing and scoping components to minimize unnecessary loading, right-sizing sidecar resources for low-traffic services, disabling the dashboard in production, consolidating control plane replicas in non-production environments, and using spot instances for fault-tolerant workloads. Combining these strategies typically reduces Dapr-related infrastructure spend by 30-50%.
