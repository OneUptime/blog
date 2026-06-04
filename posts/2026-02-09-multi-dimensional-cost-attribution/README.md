# How to Use Multi-Dimensional Cost Attribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Attribution, Kubernetes, Shared Services, Chargeback

Description: Implement sophisticated multi-dimensional cost attribution models that fairly allocate shared platform service costs like ingress controllers, monitoring.

---

Shared platform services like ingress controllers, monitoring stacks, and service meshes benefit multiple teams but require fair cost allocation. Simple namespace-based chargeback fails to capture actual consumption of these services. Multi-dimensional cost attribution distributes shared costs based on actual usage metrics. This guide shows you how to implement fair cost allocation for shared platform services.

## Understanding Shared Cost Allocation

Shared services include ingress controllers handling traffic for all applications, monitoring stacks scraping metrics from all namespaces, service mesh data planes running sidecars in injected pods, and centralized logging infrastructure. These costs must be allocated proportionally to users.

## Ingress Controller Cost Allocation

Allocate ingress costs based on request volume:

```python
#!/usr/bin/env python3
# ingress-cost-allocation.py

import requests

PROMETHEUS_URL = "http://prometheus.monitoring.svc:9090"
INGRESS_MONTHLY_COST = 500  # Total monthly cost of ingress controller

def get_ingress_requests_by_namespace():
    """Query Prometheus for request counts per namespace"""
    query = 'sum(increase(nginx_ingress_controller_requests[30d])) by (namespace)'

    response = requests.get(f'{PROMETHEUS_URL}/api/v1/query', params={'query': query})
    data = response.json()['data']['result']

    requests_by_ns = {}
    total_requests = 0

    for item in data:
        namespace = item['metric']['namespace']
        requests = float(item['value'][1])
        requests_by_ns[namespace] = requests
        total_requests += requests

    return requests_by_ns, total_requests

def allocate_ingress_costs():
    """Allocate ingress costs proportionally"""
    requests_by_ns, total_requests = get_ingress_requests_by_namespace()

    print("Ingress Controller Cost Allocation")
    print("=" * 60)
    print(f"Total monthly cost: ${INGRESS_MONTHLY_COST:.2f}")
    print(f"Total requests: {total_requests:,.0f}\n")

    if total_requests == 0:
        print("No ingress request metrics found")
        return {}

    allocated_costs = {}
    for namespace, requests in sorted(requests_by_ns.items(), key=lambda x: x[1], reverse=True):
        percentage = (requests / total_requests) * 100
        cost = (requests / total_requests) * INGRESS_MONTHLY_COST

        allocated_costs[namespace] = cost

        print(f"{namespace:30} {requests:>12,.0f} {percentage:>6.2f}% ${cost:>8.2f}")

    return allocated_costs

if __name__ == '__main__':
    allocate_ingress_costs()
```

## Monitoring Stack Cost Allocation

Allocate monitoring costs based on metrics volume:

```python
#!/usr/bin/env python3
# monitoring-cost-allocation.py

import requests

PROMETHEUS_URL = "http://prometheus.monitoring.svc:9090"
MONITORING_MONTHLY_COST = 1000

def get_metrics_by_namespace():
    """Get active time series count per namespace"""
    query = 'count by (namespace) ({namespace!=""})'

    response = requests.get(f'{PROMETHEUS_URL}/api/v1/query', params={'query': query})
    data = response.json()['data']['result']

    metrics_by_ns = {}
    total_metrics = 0

    for item in data:
        namespace = item['metric'].get('namespace', 'unknown')
        count = float(item['value'][1])
        metrics_by_ns[namespace] = count
        total_metrics += count

    return metrics_by_ns, total_metrics

def get_samples_by_namespace():
    """Get scraped sample count per namespace over the last 30 days"""
    query = 'sum by (namespace) (count_over_time({namespace!=""}[30d]))'

    response = requests.get(f'{PROMETHEUS_URL}/api/v1/query', params={'query': query})
    data = response.json()['data']['result']

    samples_by_ns = {}
    for item in data:
        namespace = item['metric'].get('namespace', 'unknown')
        samples = float(item['value'][1])
        samples_by_ns[namespace] = samples

    return samples_by_ns

def allocate_monitoring_costs():
    """Allocate monitoring costs based on time series volume"""
    metrics_by_ns, total_metrics = get_metrics_by_namespace()
    samples_by_ns = get_samples_by_namespace()

    print("Monitoring Stack Cost Allocation")
    print("=" * 80)

    if total_metrics == 0:
        print("No namespace metrics found")
        return {}

    allocated_costs = {}
    for namespace in metrics_by_ns.keys():
        metrics_pct = (metrics_by_ns[namespace] / total_metrics) * 100
        cost = (metrics_by_ns[namespace] / total_metrics) * MONITORING_MONTHLY_COST
        allocated_costs[namespace] = cost

        samples = samples_by_ns.get(namespace, 0)

        print(f"{namespace:25} Metrics: {metrics_by_ns[namespace]:>8.0f} ({metrics_pct:>5.2f}%) "
              f"Samples: {samples:>12.0f} Cost: ${cost:>8.2f}")

    return allocated_costs

if __name__ == '__main__':
    allocate_monitoring_costs()
```

## Service Mesh Cost Allocation

Allocate Istio/Linkerd costs based on sidecar count:

```python
#!/usr/bin/env python3
# service-mesh-cost-allocation.py

import subprocess
import json

SERVICE_MESH_MONTHLY_COST = 800

def get_sidecar_count_by_namespace():
    """Count service mesh sidecars per namespace"""
    cmd = "kubectl get pods --all-namespaces -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    pods = json.loads(result.stdout)

    sidecar_count = {}

    for pod in pods['items']:
        namespace = pod['metadata']['namespace']
        containers = pod['spec']['containers']

        # Check for Istio or Linkerd sidecar
        has_sidecar = any(
            c['name'] in ['istio-proxy', 'linkerd-proxy']
            for c in containers
        )

        if has_sidecar:
            sidecar_count[namespace] = sidecar_count.get(namespace, 0) + 1

    return sidecar_count

def allocate_service_mesh_costs():
    """Allocate service mesh costs"""
    sidecar_count = get_sidecar_count_by_namespace()
    total_sidecars = sum(sidecar_count.values())

    print("Service Mesh Cost Allocation")
    print("=" * 60)

    if total_sidecars == 0:
        print("No service mesh sidecars found")
        return {}

    allocated_costs = {}
    for namespace, count in sorted(sidecar_count.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_sidecars) * 100
        cost = (count / total_sidecars) * SERVICE_MESH_MONTHLY_COST
        allocated_costs[namespace] = cost

        print(f"{namespace:30} Sidecars: {count:>4} ({percentage:>5.2f}%) ${cost:>8.2f}")

    return allocated_costs

if __name__ == '__main__':
    allocate_service_mesh_costs()
```

## Centralized Logging Cost Allocation

Allocate logging costs based on log volume:

```python
#!/usr/bin/env python3
# logging-cost-allocation.py

import requests

LOKI_URL = "http://loki.logging.svc:3100"
LOGGING_MONTHLY_COST = 600

def get_log_volume_by_namespace():
    """Query Loki for log volume in bytes per namespace"""
    query = 'sum by (namespace) (bytes_over_time({namespace=~".+"}[30d]))'

    response = requests.get(
        f'{LOKI_URL}/loki/api/v1/query',
        params={'query': query}
    )

    data = response.json()['data']['result']

    log_volume = {}
    total_volume = 0

    for item in data:
        namespace = item['metric']['namespace']
        bytes_used = float(item['value'][1])
        log_volume[namespace] = bytes_used
        total_volume += bytes_used

    return log_volume, total_volume

def allocate_logging_costs():
    """Allocate logging costs"""
    log_volume, total_volume = get_log_volume_by_namespace()

    print("Logging Infrastructure Cost Allocation")
    print("=" * 60)

    if total_volume == 0:
        print("No namespace log volume found")
        return {}

    allocated_costs = {}
    for namespace, volume in sorted(log_volume.items(), key=lambda x: x[1], reverse=True):
        percentage = (volume / total_volume) * 100
        cost = (volume / total_volume) * LOGGING_MONTHLY_COST
        allocated_costs[namespace] = cost

        volume_gb = volume / (1024**3)
        print(f"{namespace:30} Volume: {volume_gb:>10.2f}GB ({percentage:>5.2f}%) ${cost:>8.2f}")

    return allocated_costs

if __name__ == '__main__':
    allocate_logging_costs()
```

## Comprehensive Multi-Dimensional Report

Combine all allocation dimensions:

```python
#!/usr/bin/env python3
# comprehensive-cost-report.py

def generate_comprehensive_report():
    """Generate multi-dimensional cost report"""
    # Run all allocation scripts
    compute_costs = get_compute_costs_by_namespace()  # From Kubecost
    ingress_costs = allocate_ingress_costs()
    monitoring_costs = allocate_monitoring_costs()
    mesh_costs = allocate_service_mesh_costs()
    logging_costs = allocate_logging_costs()

    # Combine all dimensions
    all_namespaces = set()
    for costs in [compute_costs, ingress_costs, monitoring_costs, mesh_costs, logging_costs]:
        all_namespaces.update(costs.keys())

    print("\nComprehensive Multi-Dimensional Cost Report")
    print("=" * 100)
    print(f"{'Namespace':<25} {'Compute':<12} {'Ingress':<12} {'Monitoring':<12} {'Mesh':<12} {'Logging':<12} {'Total':<12}")
    print("-" * 100)

    for namespace in sorted(all_namespaces):
        compute = compute_costs.get(namespace, 0)
        ingress = ingress_costs.get(namespace, 0)
        monitoring = monitoring_costs.get(namespace, 0)
        mesh = mesh_costs.get(namespace, 0)
        logging = logging_costs.get(namespace, 0)
        total = compute + ingress + monitoring + mesh + logging

        print(f"{namespace:<25} ${compute:>10.2f} ${ingress:>10.2f} ${monitoring:>10.2f} ${mesh:>10.2f} ${logging:>10.2f} ${total:>10.2f}")

if __name__ == '__main__':
    generate_comprehensive_report()
```

## Storing Attribution Data

Store allocations in a database for historical analysis:

```python
import psycopg2
from datetime import datetime

def store_allocation_data(allocations):
    """Store cost allocations in PostgreSQL"""
    conn = psycopg2.connect("dbname=finops user=postgres")
    cur = conn.cursor()

    for allocation in allocations:
        cur.execute("""
            INSERT INTO cost_allocations
            (date, namespace, dimension, metric_value, allocated_cost)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            datetime.now().date(),
            allocation['namespace'],
            allocation['dimension'],
            allocation['metric_value'],
            allocation['allocated_cost']
        ))

    conn.commit()
    cur.close()
    conn.close()
```

## Automated Monthly Reporting

Schedule monthly allocation reports:

```yaml
# allocation-report-cronjob.yaml

apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-cost-allocation
  namespace: finops
spec:
  schedule: "0 9 1 * *"  # First day of month at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: reporter
            image: cost-allocation-reporter:v1.0
            command: ["/bin/sh", "-c"]
            args:
            - |
              export REPORT_MONTH="$(date -u -d 'last month' +%Y-%m)"
              /app/generate-report
          restartPolicy: OnFailure
```

## Conclusion

Multi-dimensional cost attribution provides fair allocation of shared platform service costs based on actual consumption patterns. By tracking metrics like request volume, log volume, and sidecar count, organizations can accurately distribute infrastructure costs across teams, driving accountability and informed optimization decisions. This approach typically reveals that 20-30% of platform costs should be reallocated from simple namespace-based models.
