# How to Set Up Cost Allocation per Namespace on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cost Allocation, Kubernetes, FinOps, Monitoring

Description: Learn how to implement per-namespace cost allocation on Talos Linux clusters using open-source tools for tracking and reporting.

---

Understanding where your Kubernetes spending goes is essential for financial accountability. When multiple teams share a Talos Linux cluster, you need a way to attribute infrastructure costs to the correct team, project, or department. Cost allocation per namespace is the most natural approach in Kubernetes, since namespaces typically map to teams or applications. This guide covers how to set up cost tracking and reporting on a Talos Linux cluster using open-source tools.

## Why Cost Allocation Matters

Without cost visibility, shared clusters lead to disputes about who should pay for what. Teams over-provision resources because there is no incentive to optimize. Finance departments cannot tie infrastructure spending to business units. Cost allocation solves these problems by providing clear attribution of compute, storage, and network costs to specific namespaces.

## Prerequisites

- A running Talos Linux cluster
- Prometheus and Grafana installed (for metrics collection and visualization)
- kubectl and Helm installed locally

## Installing OpenCost

OpenCost is an open-source project that provides real-time cost allocation for Kubernetes workloads. It integrates with Prometheus and supports multiple cloud providers.

```bash
# Add the OpenCost Helm repository
helm repo add opencost https://opencost.github.io/opencost-helm-chart
helm repo update

# Install OpenCost
helm install opencost opencost/opencost \
  --namespace opencost \
  --create-namespace \
  --set opencost.prometheus.internal.serviceName=prometheus-server \
  --set opencost.prometheus.internal.namespaceName=monitoring \
  --set opencost.ui.enabled=true
```

If you are using the Prometheus Operator (kube-prometheus-stack), adjust the configuration.

```yaml
# opencost-values.yaml
opencost:
  prometheus:
    internal:
      serviceName: prometheus-kube-prometheus-prometheus
      namespaceName: monitoring
      port: 9090
  ui:
    enabled: true
    ingress:
      enabled: true
      hosts:
        - host: opencost.internal.example.com
          paths:
            - /
  exporter:
    defaultClusterId: talos-production
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

```bash
helm install opencost opencost/opencost \
  --namespace opencost \
  --create-namespace \
  --values opencost-values.yaml
```

Verify the installation.

```bash
# Check OpenCost pods
kubectl get pods -n opencost

# Port-forward to access the UI
kubectl port-forward -n opencost svc/opencost 9090:9090

# Open http://localhost:9090 in your browser
```

## Configuring Custom Pricing

For on-premises Talos Linux clusters or bare-metal deployments, you need to configure custom pricing since OpenCost does not have cloud pricing data.

```yaml
# custom-pricing.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opencost-custom-pricing
  namespace: opencost
data:
  default.json: |
    {
      "provider": "custom",
      "description": "Talos Linux bare-metal cluster",
      "CPU": "0.031",
      "RAM": "0.004",
      "GPU": "0.95",
      "storage": "0.00005",
      "zoneNetworkEgress": "0.01",
      "regionNetworkEgress": "0.01",
      "internetNetworkEgress": "0.12"
    }
```

The pricing values represent cost per unit per hour:
- CPU: cost per CPU core per hour
- RAM: cost per GB per hour
- Storage: cost per GB per hour

Calculate these based on your hardware costs, amortization period, and operational overhead.

```bash
# Apply custom pricing
kubectl apply -f custom-pricing.yaml

# Restart OpenCost to pick up the new pricing
kubectl rollout restart deployment/opencost -n opencost
```

## Querying Cost Data via API

OpenCost exposes a REST API for programmatic access to cost data.

```bash
# Get cost allocation for the last 24 hours grouped by namespace
curl -s "http://localhost:9090/allocation/compute?window=1d&aggregate=namespace" | \
  jq '.data[] | to_entries[] | {namespace: .key, totalCost: .value.totalCost}'

# Get cost allocation for the last 7 days
curl -s "http://localhost:9090/allocation/compute?window=7d&aggregate=namespace" | \
  jq '.data[] | to_entries[] | {namespace: .key, cpuCost: .value.cpuCost, ramCost: .value.ramCost, totalCost: .value.totalCost}'

# Get cost per controller (deployment, statefulset, etc.)
curl -s "http://localhost:9090/allocation/compute?window=1d&aggregate=controller" | \
  jq '.data[] | to_entries[] | select(.value.totalCost > 0.01) | {controller: .key, totalCost: .value.totalCost}'
```

## Setting Up Prometheus Metrics for Cost Tracking

Even without OpenCost, you can build basic cost tracking using Prometheus metrics from kube-state-metrics and cAdvisor.

```yaml
# cost-recording-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-allocation-rules
  namespace: monitoring
spec:
  groups:
    - name: cost-allocation
      interval: 5m
      rules:
        # CPU cost per namespace (requests-based)
        - record: namespace:cpu_cost_hourly:sum
          expr: |
            sum by (namespace) (
              kube_pod_container_resource_requests{resource="cpu"}
            ) * 0.031

        # Memory cost per namespace (requests-based)
        - record: namespace:memory_cost_hourly:sum
          expr: |
            sum by (namespace) (
              kube_pod_container_resource_requests{resource="memory"}
            ) / 1073741824 * 0.004

        # Total cost per namespace
        - record: namespace:total_cost_hourly:sum
          expr: |
            namespace:cpu_cost_hourly:sum + namespace:memory_cost_hourly:sum

        # Storage cost per namespace
        - record: namespace:storage_cost_hourly:sum
          expr: |
            sum by (namespace) (
              kube_persistentvolumeclaim_resource_requests_storage_bytes
            ) / 1073741824 * 0.00005
```

## Building a Grafana Dashboard

Create a Grafana dashboard for cost visibility.

```json
{
  "dashboard": {
    "title": "Namespace Cost Allocation - Talos Cluster",
    "panels": [
      {
        "title": "Daily Cost by Namespace",
        "type": "barchart",
        "targets": [
          {
            "expr": "sum by (namespace) (namespace:total_cost_hourly:sum) * 24",
            "legendFormat": "{{namespace}}"
          }
        ]
      },
      {
        "title": "Monthly Cost Projection",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(namespace:total_cost_hourly:sum) * 24 * 30",
            "legendFormat": "Projected Monthly Cost"
          }
        ]
      },
      {
        "title": "CPU Cost by Namespace",
        "type": "piechart",
        "targets": [
          {
            "expr": "namespace:cpu_cost_hourly:sum * 24 * 30",
            "legendFormat": "{{namespace}}"
          }
        ]
      }
    ]
  }
}
```

## Automated Cost Reports

Generate and distribute cost reports automatically.

```yaml
# cost-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-cost-report
  namespace: opencost
spec:
  schedule: "0 8 * * 1"  # Every Monday at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: reporter
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "Weekly Cost Report - Talos Linux Cluster"
                  echo "========================================="
                  echo ""
                  echo "Cost allocation by namespace (last 7 days):"
                  echo ""

                  # Query OpenCost API
                  curl -s "http://opencost.opencost:9090/allocation/compute?window=7d&aggregate=namespace" | \
                    jq -r '.data[] | to_entries[] | select(.value.totalCost > 0) | "\(.key): $\(.value.totalCost | . * 100 | round / 100)"' | \
                    sort -t'$' -k2 -rn

                  echo ""
                  echo "Total cluster cost (last 7 days):"
                  curl -s "http://opencost.opencost:9090/allocation/compute?window=7d&aggregate=cluster" | \
                    jq -r '.data[] | to_entries[] | "  $\(.value.totalCost | . * 100 | round / 100)"'

                  # In production, you would send this via email or Slack
          restartPolicy: OnFailure
```

## Labeling Strategy for Cost Attribution

Good cost allocation depends on consistent labeling across your cluster.

```yaml
# namespace-labels-standard.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    # Cost allocation labels
    cost-center: "CC-1234"
    department: "engineering"
    team: "alpha"
    environment: "production"
    project: "payment-service"
```

Enforce these labels with a Kyverno policy.

```yaml
# require-cost-labels.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-cost-labels
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-cost-center
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              names:
                - kube-*
                - default
      validate:
        message: "Namespaces must have cost-center, department, and team labels"
        pattern:
          metadata:
            labels:
              cost-center: "?*"
              department: "?*"
              team: "?*"
```

## Showback vs Chargeback

There are two models for cost allocation:

**Showback**: Show each team their costs without actually charging them. This is a good starting point and encourages awareness without creating friction.

**Chargeback**: Actually bill each team or department for their resource usage. This requires more accurate tracking and organizational buy-in.

Start with showback and move to chargeback as your cost data matures and teams trust the numbers.

## Wrapping Up

Cost allocation per namespace on Talos Linux gives you the financial visibility needed to manage shared clusters effectively. OpenCost provides an excellent foundation for automated cost tracking, while Prometheus recording rules and Grafana dashboards offer flexible custom reporting. The key is to establish a consistent labeling strategy, enforce it with policies, and make cost data accessible to teams through dashboards and regular reports. Whether you run Talos Linux on cloud instances or bare metal, understanding where resources go is the first step toward optimizing spending and maintaining accountability.
