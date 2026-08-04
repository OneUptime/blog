# How to Set Up Cost Management for Rancher Clusters - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Cost-Management, Kubecost, OpenCost, Kubernetes, FinOps

Description: A guide to implementing cost management for Rancher-managed Kubernetes clusters using OpenCost and Kubecost, including cost allocation, budgets, and optimization.

## Overview

Without proper cost visibility, Kubernetes infrastructure costs can spiral out of control. Rancher manages multiple clusters, making cross-cluster cost management essential. This guide covers deploying OpenCost or Kubecost on Rancher-managed clusters, configuring cost allocation by namespace and team, setting budgets, and identifying cost optimization opportunities.

## Why Kubernetes Cost Management Is Hard

- Shared infrastructure makes cost allocation non-trivial
- Unused resource reservations inflate costs
- Multiple clusters managed by Rancher span multiple accounts
- Developer self-service can lead to over-provisioning

## Step 1: Install OpenCost (Free, Open Source)

```bash
# Install OpenCost with Rancher Monitoring's Prometheus service

# Rancher Monitoring must already be installed in cattle-monitoring-system

helm repo add opencost-charts https://opencost.github.io/opencost-helm-chart
helm repo update

helm install opencost opencost-charts/opencost \
  --namespace opencost \
  --create-namespace \
  --set opencost.prometheus.internal.enabled=true \
  --set opencost.prometheus.internal.namespaceName=cattle-monitoring-system \
  --set opencost.prometheus.internal.serviceName=rancher-monitoring-prometheus \
  --set opencost.prometheus.internal.port=9090

# Access OpenCost UI
kubectl port-forward svc/opencost 9090:9090 -n opencost
```

## Step 2: Configure Cloud Costs (AWS)

```bash
# Create the AWS cloud-integration secret used by OpenCost Cloud Costs
cat > cloud-integration.json <<'EOF'
{
  "aws": {
    "athena": [
      {
        "bucket": "s3://aws-athena-query-results-123456789012-us-east-1",
        "region": "us-east-1",
        "database": "athenacurcfn",
        "table": "my_cur",
        "workgroup": "primary",
        "account": "123456789012",
        "authorizer": {
          "authorizerType": "AWSAccessKey",
          "id": "REPLACE_WITH_AWS_ACCESS_KEY_ID",
          "secret": "REPLACE_WITH_AWS_SECRET_ACCESS_KEY"
        }
      }
    ]
  }
}
EOF

kubectl create secret generic cloud-costs \
  --from-file=cloud-integration.json \
  --namespace opencost

helm upgrade opencost opencost-charts/opencost \
  --namespace opencost \
  --reuse-values \
  --set opencost.cloudIntegrationSecret=cloud-costs \
  --set opencost.cloudCost.enabled=true
```

## Step 3: Install Kubecost (More Features, Free Tier Available)

```bash
# Install the current Kubecost chart (Kubecost 3.x requires Kubernetes 1.29+)
helm repo add kubecost https://kubecost.github.io/kubecost/
helm repo update

helm install kubecost kubecost/kubecost \
  --namespace kubecost \
  --create-namespace \
  --set global.clusterId=rancher-cluster-1

# Access Kubecost UI
kubectl port-forward svc/kubecost-frontend 9090:9090 -n kubecost
```

## Step 4: Cost Allocation Labels

Label your workloads for granular cost allocation:

```yaml
# Standard cost allocation labels
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
  labels:
    app: api-service
    team: platform-engineering    # Team label for allocation
    cost-center: "CC-1234"        # Finance cost center
    environment: production
    project: user-onboarding      # Project label
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        team: platform-engineering
        cost-center: "CC-1234"
        environment: production
        project: user-onboarding
    spec:
      containers:
        - name: api-service
          image: nginx:1.27
```

## Step 5: Budget Alerts

```yaml
# OpenCost Budget Alert (via Alertmanager)
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-budget-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: cost-budgets
      rules:
        # Alert if a namespace exceeds $500/month
        - alert: NamespaceBudgetExceeded
          expr: |
            sum by(namespace) (
              container_cpu_allocation * on (node) group_left node_cpu_hourly_cost +
              container_memory_allocation_bytes * on (node) group_left node_ram_hourly_cost / (1024 * 1024 * 1024) +
              pod_pvc_allocation * on (persistentvolume) group_left pv_hourly_cost / (1024 * 1024 * 1024)
            ) * 730 > 500
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Namespace {{ $labels.namespace }} exceeds $500/month budget"
            description: "Current monthly cost: ${{ $value | printf \"%.2f\" }}"

        # Alert if cluster monthly cost exceeds threshold
        - alert: ClusterCostSpike
          expr: |
            sum(
              container_cpu_allocation * on (node) group_left node_cpu_hourly_cost +
              container_memory_allocation_bytes * on (node) group_left node_ram_hourly_cost / (1024 * 1024 * 1024) +
              pod_pvc_allocation * on (persistentvolume) group_left pv_hourly_cost / (1024 * 1024 * 1024)
            ) * 730 > 10000
          for: 2h
          labels:
            severity: critical
          annotations:
            summary: "Cluster monthly cost exceeds $10,000"
```

## Step 6: Identify Cost Optimization Opportunities

### Find Over-Provisioned Workloads

```bash
# Spot-check current CPU usage
# Low current usage relative to requests can indicate over-provisioning

kubectl top pod -A --sort-by=cpu | head -20

# Kubecost request right-sizing recommendations
curl -G "http://kubecost-frontend.kubecost.svc:9090/model/savings/requestSizingV2" \
  --data-urlencode "window=7d" \
  | jq -r '.[] | [
      .namespace,
      .controllerKind,
      .controllerName,
      .containerName,
      ((.monthlySavings.cpu + .monthlySavings.memory) | tostring)
    ] | @tsv' \
  | sort -k5 -rn \
  | head -20
```

### Identify Unused Volumes

```bash
# Find bound PVCs that are not referenced by any pod
join -t $'\t' -v1 \
  <(
    kubectl get pvc -A -o json \
      | jq -r '.items[]
        | select(.status.phase == "Bound")
        | [.metadata.namespace + "/" + .metadata.name, .spec.resources.requests.storage] | @tsv' \
      | sort
  ) \
  <(
    kubectl get pods -A -o json \
      | jq -r '.items[]
        | .metadata.namespace as $ns
        | .spec.volumes[]?
        | select(.persistentVolumeClaim != null)
        | "\($ns)/\(.persistentVolumeClaim.claimName)"' \
      | sort -u
  )

# Released PVs are no longer bound, but may still require manual cleanup
kubectl get pv | grep Released
```

### VPA Recommendations for Right-Sizing

```yaml
# Create a VPA in recommendation mode (the VPA controller and CRDs must already be installed)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  updatePolicy:
    updateMode: "Off"    # Recommendations only, no auto-update
```

```bash
# View VPA recommendations
kubectl get vpa api-service-vpa -n production -o json \
  | jq '.status.recommendation.containerRecommendations[0]'
# Shows: lowerBound, target, upperBound for CPU and memory
```

## Step 7: Cost Reports Dashboard

```bash
# Generate monthly cost report per team
curl -G "http://kubecost-frontend.kubecost.svc:9090/model/allocation" \
  --data-urlencode "window=month" \
  --data-urlencode "aggregate=label:team" \
  --data-urlencode "accumulate=true" \
  | jq -r '.data[0] | to_entries[] | [.key, (.value.totalCost | tostring)] | @tsv' \
  | sort -k2 -rn
```

## Step 8: Chargeback and Showback

```bash
#!/bin/bash
# generate-chargeback-report.sh
# Generate monthly chargeback report per team

MONTH="${1:-$(date -u +%Y-%m)}"
START="$(date -u -d "${MONTH}-01" +%Y-%m-%dT00:00:00Z)"
END="$(date -u -d "${MONTH}-01 +1 month" +%Y-%m-%dT00:00:00Z)"

echo "Generating chargeback report for ${MONTH}"
echo ""
echo "Team,Namespace,CPU Cost,Memory Cost,Storage Cost,Total Cost"

# Query OpenCost API for team and namespace costs
curl -sG "http://opencost.opencost.svc:9003/allocation" \
  --data-urlencode "window=${START},${END}" \
  --data-urlencode "aggregate=label:team,namespace" \
  --data-urlencode "accumulate=true" \
  | jq -r '.data[0] | to_entries[] |
    (.key | split("/")) as $key |
    [
      (if ($key[0] // "__unallocated__") == "__unallocated__" then "untagged" else $key[0] end),
      ($key[1] // "__unallocated__"),
      (.value.cpuCost | tostring),
      (.value.ramCost | tostring),
      (.value.pvCost | tostring),
      (.value.totalCost | tostring)
    ] | @csv'
```

## Conclusion

Cost management for Rancher clusters requires both visibility tools (OpenCost, Kubecost) and operational practices (labeling, budgeting, right-sizing). OpenCost provides a free, open-source foundation for cost visibility, while Kubecost adds features like savings recommendations and showback reports. Consistently applying cost allocation labels to all workloads is the most impactful action you can take for cost governance. Combine with VPA recommendations and regular right-sizing reviews to continuously optimize your Kubernetes infrastructure costs.
