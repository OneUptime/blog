# Using OpenTelemetry Metrics to Detect Under- and Overprovisioned Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Capacity Planning, Cost Optimization, Resource Management

Description: Use OpenTelemetry resource metrics to identify services that are wasting money or at risk of failure due to incorrect provisioning.

Every engineering team has services that are drastically overprovisioned - paying for 8 CPU cores when they use 0.5 - and others that are a traffic spike away from falling over. The tricky part is finding them across hundreds of services. OpenTelemetry gives you a consistent way to collect resource metrics from every service, and with the right queries, you can build a provisioning scorecard that highlights both waste and risk.

## Setting Up Consistent Resource Collection

The first requirement is having every service report resource usage in the same format. Use the OpenTelemetry auto-instrumentation or SDK to add resource metrics, and the collector to enrich them with deployment metadata.

This collector config enriches incoming metrics with Kubernetes metadata so you can group by service, namespace, and deployment. If you remote-write directly to Prometheus, start Prometheus with `--web.enable-remote-write-receiver`:

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  k8sattributes:
    auth_type: "serviceAccount"
    extract:
      metadata:
        - k8s.deployment.name
        - k8s.namespace.name
        - k8s.node.name
      labels:
        - tag_name: app.team
          key: team
          from: pod
    pod_association:
      - sources:
          - from: connection
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip

  resource:
    attributes:
      - key: cluster
        value: "prod-us-east-1"
        action: upsert

exporters:
  prometheus_remote_write:
    endpoint: "http://prometheus:9090/api/v1/write"
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [k8sattributes, resource]
      exporters: [prometheus_remote_write]
```

## Defining Provisioning Thresholds

Before you can classify services, you need to define what "underprovisioned" and "overprovisioned" mean in your context. Here are reasonable starting thresholds based on what has worked well for production systems.

These thresholds define the bands for provisioning status:

```yaml
# provisioning-thresholds.yaml
# These are P95 utilization values over a 7-day window
thresholds:
  cpu:
    critically_underprovisioned: 0.90  # P95 CPU > 90%
    underprovisioned: 0.70             # P95 CPU > 70%
    well_provisioned_min: 0.20         # P95 CPU between 20-70%
    overprovisioned: 0.10              # P95 CPU < 10%
    severely_overprovisioned: 0.05     # P95 CPU < 5%
  memory:
    critically_underprovisioned: 0.90
    underprovisioned: 0.75
    well_provisioned_min: 0.30
    overprovisioned: 0.15
    severely_overprovisioned: 0.08
```

## Building the Detection Queries

The core of this approach is a set of PromQL queries that calculate utilization ratios for each service. You compare actual usage against requested (or limit) resources.

These queries compute CPU and memory utilization ratios per deployment, using the P95 over a week to avoid false positives from short spikes. The joins map pod-level container metrics to their owning Deployment through kube-state-metrics:

```promql
# CPU utilization ratio: actual usage vs requested
# Values > 1.0 mean the service is using more than it requested
quantile_over_time(0.95,
  (
    sum by (namespace, deployment) (
      rate(container_cpu_usage_seconds_total{container!="POD",container!="",pod!=""}[5m])
      * on (namespace, pod) group_left(replicaset)
        label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
      * on (namespace, replicaset) group_left(deployment)
        label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
    )
    /
    sum by (namespace, deployment) (
      kube_pod_container_resource_requests{resource="cpu",unit="core"}
      * on (namespace, pod) group_left(replicaset)
        label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
      * on (namespace, replicaset) group_left(deployment)
        label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
    )
  )[7d:1h]
)

# Memory utilization ratio: working set vs requested
quantile_over_time(0.95,
  (
    sum by (namespace, deployment) (
      container_memory_working_set_bytes{container!="POD",container!="",pod!=""}
      * on (namespace, pod) group_left(replicaset)
        label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
      * on (namespace, replicaset) group_left(deployment)
        label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
    )
    /
    sum by (namespace, deployment) (
      kube_pod_container_resource_requests{resource="memory",unit="byte"}
      * on (namespace, pod) group_left(replicaset)
        label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
      * on (namespace, replicaset) group_left(deployment)
        label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
    )
  )[7d:1h]
)
```

## Automating the Provisioning Report

Rather than manually checking dashboards, generate a report programmatically. This script queries Prometheus and classifies each service.

This Python script builds a complete provisioning report by querying utilization ratios and classifying each service:

```python
import requests
from collections import defaultdict

PROM_URL = "http://prometheus:9090"

def query_prometheus(promql):
    """Execute a PromQL query and return results."""
    resp = requests.get(f"{PROM_URL}/api/v1/query", params={"query": promql})
    resp.raise_for_status()
    return resp.json()["data"]["result"]

def classify_utilization(ratio, resource_type="cpu"):
    """Classify a utilization ratio into a provisioning category."""
    if ratio > 0.90:
        return "critically_underprovisioned"
    elif ratio > 0.70:
        return "underprovisioned"
    elif ratio > 0.20:
        return "well_provisioned"
    elif ratio > 0.10:
        return "overprovisioned"
    else:
        return "severely_overprovisioned"

# Query P95 CPU utilization per deployment over 7 days
cpu_query = """
    quantile_over_time(0.95,
      (
        sum by (namespace, deployment) (
          rate(container_cpu_usage_seconds_total{container!="POD",container!="",pod!=""}[5m])
          * on (namespace, pod) group_left(replicaset)
            label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
          * on (namespace, replicaset) group_left(deployment)
            label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
        )
        /
        sum by (namespace, deployment) (
          kube_pod_container_resource_requests{resource="cpu",unit="core"}
          * on (namespace, pod) group_left(replicaset)
            label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
          * on (namespace, replicaset) group_left(deployment)
            label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
        )
      )[7d:1h]
    )
"""

request_query = """
    sum by (namespace, deployment) (
      kube_pod_container_resource_requests{resource="cpu",unit="core"}
      * on (namespace, pod) group_left(replicaset)
        label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
      * on (namespace, replicaset) group_left(deployment)
        label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
    )
"""

results = query_prometheus(cpu_query)
report = defaultdict(dict)

for r in results:
    ns = r["metric"].get("namespace", "unknown")
    deploy = r["metric"].get("deployment", "unknown")
    ratio = float(r["value"][1])
    status = classify_utilization(ratio, "cpu")
    report[f"{ns}/{deploy}"]["cpu_p95"] = ratio
    report[f"{ns}/{deploy}"]["cpu_status"] = status

for r in query_prometheus(request_query):
    ns = r["metric"].get("namespace", "unknown")
    deploy = r["metric"].get("deployment", "unknown")
    report[f"{ns}/{deploy}"]["requested_cpu_cores"] = float(r["value"][1])

# Print the report sorted by waste potential
print(f"{'Service':<40} {'CPU P95':>8} {'Status':<30}")
print("-" * 78)
for svc, data in sorted(report.items(), key=lambda x: x[1].get("cpu_p95", 0)):
    print(f"{svc:<40} {data['cpu_p95']:>7.1%} {data['cpu_status']:<30}")
```

## Calculating Waste in Dollar Terms

Identifying overprovisioned services is more compelling when you attach a dollar figure. Here is how to estimate the savings.

This calculation converts wasted CPU cores to approximate monthly cost:

```python
# Cost estimation for overprovisioned services
COST_PER_CPU_CORE_PER_MONTH = 35.00  # Adjust for your cloud provider
COST_PER_GB_MEMORY_PER_MONTH = 5.00

def estimate_savings(services_report):
    """Calculate potential savings from right-sizing overprovisioned services."""
    total_savings = 0.0

    for svc, data in services_report.items():
        if data["cpu_status"] in ("overprovisioned", "severely_overprovisioned"):
            current_cores = data.get("requested_cpu_cores", 0)
            actual_usage = data["cpu_p95"] * current_cores
            # Right-size to 50% utilization target with some buffer
            recommended_cores = actual_usage / 0.50
            wasted_cores = current_cores - recommended_cores

            if wasted_cores > 0:
                monthly_savings = wasted_cores * COST_PER_CPU_CORE_PER_MONTH
                total_savings += monthly_savings
                print(f"{svc}: Reduce from {current_cores:.1f} to "
                      f"{recommended_cores:.1f} cores "
                      f"(save ${monthly_savings:.2f}/month)")

    print(f"\nTotal potential savings: ${total_savings:.2f}/month")
```

## Setting Up Continuous Monitoring

Once you have the initial report, turn it into ongoing monitoring with Prometheus alerts.

These alert rules fire when services remain in a bad provisioning state for over 24 hours:

```yaml
# provisioning-alerts.yaml
groups:
  - name: provisioning_status
    rules:
      - alert: ServiceSeverelyOverprovisioned
        expr: |
          quantile_over_time(0.95,
            (
              sum by (namespace, deployment) (
                rate(container_cpu_usage_seconds_total{container!="POD",container!="",pod!=""}[5m])
                * on (namespace, pod) group_left(replicaset)
                  label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
                * on (namespace, replicaset) group_left(deployment)
                  label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
              )
              /
              sum by (namespace, deployment) (
                kube_pod_container_resource_requests{resource="cpu",unit="core"}
                * on (namespace, pod) group_left(replicaset)
                  label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
                * on (namespace, replicaset) group_left(deployment)
                  label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
              )
            )
          [7d:1h]) < 0.05
        for: 24h
        labels:
          severity: info
          category: cost
        annotations:
          summary: "{{ $labels.deployment }} in {{ $labels.namespace }} is using less than 5% of requested CPU"

      - alert: ServiceCriticallyUnderprovisioned
        expr: |
          quantile_over_time(0.95,
            (
              sum by (namespace, deployment) (
                rate(container_cpu_usage_seconds_total{container!="POD",container!="",pod!=""}[5m])
                * on (namespace, pod) group_left(replicaset)
                  label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
                * on (namespace, replicaset) group_left(deployment)
                  label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
              )
              /
              sum by (namespace, deployment) (
                kube_pod_container_resource_requests{resource="cpu",unit="core"}
                * on (namespace, pod) group_left(replicaset)
                  label_replace(kube_pod_owner{owner_kind="ReplicaSet",owner_is_controller="true"}, "replicaset", "$1", "owner_name", "(.*)")
                * on (namespace, replicaset) group_left(deployment)
                  label_replace(kube_replicaset_owner{owner_kind="Deployment"}, "deployment", "$1", "owner_name", "(.*)")
              )
            )
          [7d:1h]) > 0.90
        for: 6h
        labels:
          severity: warning
          category: reliability
        annotations:
          summary: "{{ $labels.deployment }} in {{ $labels.namespace }} is using over 90% of requested CPU"
```

The key insight here is that you need both sides of the equation. Underprovisioned services are a reliability risk, while overprovisioned services are a cost problem. OpenTelemetry's consistent metric collection across all your services makes it possible to spot both issues from a single data source, rather than checking each service individually.
