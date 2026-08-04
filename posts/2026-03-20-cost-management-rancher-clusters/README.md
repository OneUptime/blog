# How to Set Up Cost Management for Rancher Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Cost Management, FinOps, Kubernetes, Resource Optimization, OpenCost

Description: Set up cost management for Rancher clusters using OpenCost, Kubecost, and resource right-sizing to track spending per team and namespace, identify waste, and reduce cloud infrastructure costs.

## Introduction

Kubernetes clusters often run with significant resource waste: over-provisioned requests, idle workloads, underutilized nodes, and forgotten development environments. Cost management for Rancher involves measuring per-namespace/team costs, identifying waste, right-sizing pods, and implementing governance to prevent cost overruns.

## Step 1: Install OpenCost

```bash
# Install OpenCost for cost monitoring

helm repo add opencost https://opencost.github.io/opencost-helm-chart
helm repo update

helm install opencost opencost/opencost \
  --namespace opencost \
  --create-namespace \
  --set opencost.prometheus.internal.enabled=false \
  --set opencost.prometheus.external.enabled=true \
  --set opencost.prometheus.external.url=http://prometheus.monitoring.svc:9090

# Access OpenCost UI
kubectl port-forward svc/opencost 9003:9003 -n opencost
```

## Step 2: Configure Cloud Provider Pricing

```yaml
# opencost-values.yaml
opencost:
  # Enable cloud cost ingestion (CUR/billing data)
  cloudCost:
    enabled: true

  # AWS cloud integration (inline JSON; alternatively reference a Secret via cloudIntegrationSecret)
  cloudIntegrationJSON: |
    {
      "aws": [
        {
          "athenaBucketName": "s3://my-cur-bucket",
          "athenaRegion": "us-east-1",
          "athenaDatabase": "athenacurcfn_my_cur",
          "athenaTable": "my_cur",
          "projectID": "123456789012",
          "serviceKeyName": "AKIA...",
          "serviceKeySecret": "secret"
        }
      ]
    }

  # Custom pricing for bare-metal (overrides cloud pricing)
  customPricing:
    enabled: true
    provider: custom
    costModel:
      CPU: "0.031611"       # $ per vCPU hour
      RAM: "0.004237"       # $ per GB RAM hour
      storage: "0.00005479" # $ per GB disk hour
```

## Step 3: Track Costs per Team/Namespace

```bash
# Query OpenCost API for namespace costs
curl http://localhost:9003/allocation \
  -d 'window=7d' \
  -d 'aggregate=namespace' \
  -d 'accumulate=false' | jq '.data[] | to_entries[] | {
    namespace: .key,
    cpu_cost: .value.cpuCost,
    memory_cost: .value.ramCost,
    total_cost: .value.totalCost
  }'

# Team cost breakdown (group by label)
curl http://localhost:9003/allocation \
  -d 'window=30d' \
  -d 'aggregate=label:team' | jq '.data[]'
```

## Step 4: Right-Size Pod Resources

```bash
# Install VPA for recommendations
helm install vpa fairwinds-stable/vpa \
  --namespace vpa-system \
  --create-namespace

# Get VPA recommendations without applying
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Off"    # Recommendations only, no auto-update
EOF

# View recommendations after 24h
kubectl describe vpa api-server-vpa -n production
# Shows: recommended CPU: 250m (currently requesting 1000m = 4x oversized)
```

## Step 5: Identify and Clean Up Waste

```bash
# Find idle/unused resources

# 1. Pods with no CPU usage in 7 days
kubectl top pods -A --sort-by=cpu | \
  awk '$3 == "0m" {print $1, $2}'

# 2. Deployments with 0 replicas
kubectl get deployments -A \
  -o jsonpath='{range .items[?(@.spec.replicas==0)]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'

# 3. Unattached PVCs
kubectl get pvc -A | grep -v Bound

# 4. Old/unused images (nodes)
docker image prune -a --filter "until=720h"   # Remove images > 30 days old

# 5. LoadBalancer services with no traffic
kubectl get svc -A -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.metadata.namespace}/{.metadata.name}: {.status.loadBalancer.ingress[0].ip}{"\n"}{end}'
```

## Step 6: Resource Governance with LimitRange

```yaml
# Enforce resource requests to prevent unlimited consumption
apiVersion: v1
kind: LimitRange
metadata:
  name: cost-governance
  namespace: development
spec:
  limits:
    # Default requests/limits for all containers
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"         # No single container > 4 cores
        memory: "8Gi"

    # PVC size limits
    - type: PersistentVolumeClaim
      max:
        storage: "100Gi"   # No single PVC > 100GB
```

## Step 7: Cost Alerts

```yaml
# Alert when namespace cost exceeds budget
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-alerts
  namespace: opencost
spec:
  groups:
    - name: costs
      rules:
        - alert: NamespaceCostExceedsBudget
          expr: |
            sum(rate(container_cpu_usage_seconds_total{namespace=~"team-.*"}[5m])) by (namespace)
            * 730 * 0.031611 > 1000
          for: 1h
          annotations:
            summary: "Namespace {{ $labels.namespace }} monthly CPU cost exceeds $1000"
          labels:
            severity: warning
```

## Cost Optimization Checklist

- OpenCost or Kubecost deployed for cost visibility
- Per-namespace cost dashboards in Grafana
- VPA recommendations reviewed monthly
- ResourceQuotas and LimitRanges on all namespaces
- Idle resources identified and cleaned up weekly
- Spot/preemptible instances for dev/test workloads
- Node autoscaler configured to scale down at night
- Right-sizing recommendations applied quarterly

## Conclusion

Cost management in Rancher requires visibility (OpenCost metrics), governance (ResourceQuotas, LimitRanges), and optimization (VPA right-sizing, idle resource cleanup). The most impactful savings usually come from: right-sizing overprovisioned pods (often 50-70% waste), cleaning up development environments that run 24/7, and using spot/preemptible instances for stateless workloads. Establish monthly cost review meetings where teams review their namespace spending and identify optimization opportunities.
