# How to Use OpenTelemetry Metrics for Cloud Cost Right-Sizing (AWS, GCP, Azure Instance Types)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cloud Cost Optimization, AWS, GCP, Azure

Description: Map OpenTelemetry resource utilization metrics to specific cloud instance types and find cheaper alternatives that still meet your workload needs.

Cloud bills grow quietly. You provision an instance type during a load test, forget about it, and six months later you are paying for compute that never breaks 15% utilization. OpenTelemetry gives you the actual resource consumption data, and with a mapping to cloud provider instance catalogs, you can find the right instance type for each workload rather than guessing.

## Collecting the Right Metrics

For instance right-sizing, you need four things: CPU utilization patterns, memory usage patterns, network throughput, and disk I/O. The standard OpenTelemetry host metrics receiver covers all of these.

This collector config gathers the four resource dimensions needed for instance type matching:

```yaml
# otel-collector-config.yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.usage:
            enabled: true
          system.memory.utilization:
            enabled: true
      network:
        metrics:
          system.network.io:
            enabled: true
      disk:
        metrics:
          system.disk.io:
            enabled: true
          system.disk.operations:
            enabled: true

processors:
  resource:
    attributes:
      - key: cloud.provider
        from_attribute: cloud.provider
        action: upsert
      - key: cloud.instance.type
        from_attribute: host.type
        action: upsert
      - key: cloud.region
        from_attribute: cloud.region
        action: upsert

exporters:
  prometheusremotewrite:
    endpoint: "http://prometheus:9090/api/v1/write"

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [resource]
      exporters: [prometheusremotewrite]
```

## Building an Instance Type Catalog

You need a reference dataset of instance types with their specs and pricing. Here is how to structure it for the three major cloud providers.

This Python module defines instance specs and on-demand pricing for common instance families:

```python
# instance_catalog.py
INSTANCE_CATALOG = {
    "aws": {
        "m5.large":    {"vcpus": 2,  "memory_gb": 8,   "network_gbps": 10,  "price_hourly": 0.096},
        "m5.xlarge":   {"vcpus": 4,  "memory_gb": 16,  "network_gbps": 10,  "price_hourly": 0.192},
        "m5.2xlarge":  {"vcpus": 8,  "memory_gb": 32,  "network_gbps": 10,  "price_hourly": 0.384},
        "c5.large":    {"vcpus": 2,  "memory_gb": 4,   "network_gbps": 10,  "price_hourly": 0.085},
        "c5.xlarge":   {"vcpus": 4,  "memory_gb": 8,   "network_gbps": 10,  "price_hourly": 0.170},
        "r5.large":    {"vcpus": 2,  "memory_gb": 16,  "network_gbps": 10,  "price_hourly": 0.126},
        "r5.xlarge":   {"vcpus": 4,  "memory_gb": 32,  "network_gbps": 10,  "price_hourly": 0.252},
        "t3.large":    {"vcpus": 2,  "memory_gb": 8,   "network_gbps": 5,   "price_hourly": 0.083},
        "t3.xlarge":   {"vcpus": 4,  "memory_gb": 16,  "network_gbps": 5,   "price_hourly": 0.166},
    },
    "gcp": {
        "e2-standard-2":  {"vcpus": 2,  "memory_gb": 8,   "network_gbps": 10,  "price_hourly": 0.067},
        "e2-standard-4":  {"vcpus": 4,  "memory_gb": 16,  "network_gbps": 10,  "price_hourly": 0.134},
        "e2-standard-8":  {"vcpus": 8,  "memory_gb": 32,  "network_gbps": 16,  "price_hourly": 0.268},
        "n2-standard-2":  {"vcpus": 2,  "memory_gb": 8,   "network_gbps": 10,  "price_hourly": 0.097},
        "c2-standard-4":  {"vcpus": 4,  "memory_gb": 16,  "network_gbps": 10,  "price_hourly": 0.167},
    },
    "azure": {
        "Standard_D2s_v5": {"vcpus": 2,  "memory_gb": 8,   "network_gbps": 12.5, "price_hourly": 0.096},
        "Standard_D4s_v5": {"vcpus": 4,  "memory_gb": 16,  "network_gbps": 12.5, "price_hourly": 0.192},
        "Standard_D8s_v5": {"vcpus": 8,  "memory_gb": 32,  "network_gbps": 12.5, "price_hourly": 0.384},
        "Standard_F2s_v2": {"vcpus": 2,  "memory_gb": 4,   "network_gbps": 5,    "price_hourly": 0.085},
    }
}
```

## The Right-Sizing Engine

The core logic queries your actual resource usage from OpenTelemetry metrics, then finds the cheapest instance type that can handle your workload with appropriate headroom.

This function computes the best instance type for each host based on peak utilization over 30 days:

```python
import requests

PROM_URL = "http://prometheus:9090"

def get_host_resource_profile(instance_id):
    """Get peak resource usage for a specific instance over 30 days."""
    queries = {
        "cpu_peak_cores": f'''
            quantile_over_time(0.95,
                sum(rate(system_cpu_utilization{{host_id="{instance_id}"}}[5m]))[30d:1h]
            ) * count(system_cpu_utilization{{host_id="{instance_id}"}})
        ''',
        "memory_peak_gb": f'''
            quantile_over_time(0.95,
                system_memory_usage{{host_id="{instance_id}", state="used"}}[30d:1h]
            ) / 1073741824
        ''',
        "network_peak_gbps": f'''
            quantile_over_time(0.95,
                rate(system_network_io_total{{host_id="{instance_id}"}}[5m])[30d:1h]
            ) * 8 / 1000000000
        '''
    }

    profile = {}
    for name, query in queries.items():
        resp = requests.get(f"{PROM_URL}/api/v1/query", params={"query": query})
        results = resp.json()["data"]["result"]
        profile[name] = float(results[0]["value"][1]) if results else 0

    return profile

def find_optimal_instance(profile, provider, headroom=1.3):
    """Find the cheapest instance that fits the workload with headroom."""
    catalog = INSTANCE_CATALOG.get(provider, {})
    candidates = []

    required_cpus = profile["cpu_peak_cores"] * headroom
    required_memory = profile["memory_peak_gb"] * headroom
    required_network = profile["network_peak_gbps"] * headroom

    for instance_type, specs in catalog.items():
        if (specs["vcpus"] >= required_cpus and
            specs["memory_gb"] >= required_memory and
            specs["network_gbps"] >= required_network):
            candidates.append((instance_type, specs))

    # Sort by price and return the cheapest that fits
    candidates.sort(key=lambda x: x[1]["price_hourly"])
    return candidates[0] if candidates else None
```

## Generating Right-Sizing Recommendations

Now tie it all together by scanning all your instances and comparing current vs. optimal.

This script generates a full right-sizing report with per-instance savings estimates:

```python
def generate_rightsizing_report():
    """Scan all monitored instances and recommend right-sizing changes."""
    # Get all monitored hosts
    resp = requests.get(f"{PROM_URL}/api/v1/query", params={
        "query": 'count by (host_id, cloud_provider, cloud_instance_type) (system_cpu_utilization)'
    })
    hosts = resp.json()["data"]["result"]

    recommendations = []
    total_monthly_savings = 0

    for host in hosts:
        host_id = host["metric"]["host_id"]
        provider = host["metric"].get("cloud_provider", "aws")
        current_type = host["metric"].get("cloud_instance_type", "unknown")

        profile = get_host_resource_profile(host_id)
        optimal = find_optimal_instance(profile, provider)

        if optimal is None:
            continue

        optimal_type, optimal_specs = optimal
        current_specs = INSTANCE_CATALOG.get(provider, {}).get(current_type)

        if current_specs and optimal_specs["price_hourly"] < current_specs["price_hourly"]:
            monthly_savings = (
                current_specs["price_hourly"] - optimal_specs["price_hourly"]
            ) * 730  # Average hours per month

            recommendations.append({
                "host_id": host_id,
                "current": current_type,
                "recommended": optimal_type,
                "monthly_savings": monthly_savings,
                "cpu_headroom": optimal_specs["vcpus"] / max(profile["cpu_peak_cores"], 0.1),
                "mem_headroom": optimal_specs["memory_gb"] / max(profile["memory_peak_gb"], 0.1)
            })
            total_monthly_savings += monthly_savings

    # Sort by savings potential
    recommendations.sort(key=lambda x: x["monthly_savings"], reverse=True)

    print(f"Right-Sizing Report - {len(recommendations)} instances can be optimized")
    print(f"Total potential savings: ${total_monthly_savings:,.2f}/month\n")

    for rec in recommendations[:20]:  # Show top 20
        print(f"  {rec['host_id']}: {rec['current']} -> {rec['recommended']} "
              f"(save ${rec['monthly_savings']:.2f}/month, "
              f"CPU headroom: {rec['cpu_headroom']:.1f}x, "
              f"Mem headroom: {rec['mem_headroom']:.1f}x)")
```

## Important Caveats

Before you start resizing everything, keep these in mind:

- **Use at least 30 days of data.** Shorter windows miss monthly peaks, batch jobs, and seasonal patterns. If your business has quarterly spikes, factor those in separately.
- **Headroom matters.** The 1.3x multiplier in the code above means you need 30% spare capacity above your P95 usage. Adjust this based on how spiky your traffic is. Burstable workloads with sudden 3x spikes need more headroom than steady-state services.
- **Instance family matters too.** A compute-optimized instance (c5) with 4 vCPUs and 8 GB RAM costs less than a general-purpose instance (m5) with the same CPU but 16 GB RAM. If your workload is CPU-bound, the c-series saves money. If it is memory-bound, the r-series might be cheaper per GB.
- **Test changes in staging first.** Even if the numbers say a smaller instance works, validate it with a realistic load test before changing production.

OpenTelemetry makes this analysis possible because it provides consistent resource metrics across all your instances regardless of cloud provider. You collect the data once and run the same right-sizing logic across AWS, GCP, and Azure.
