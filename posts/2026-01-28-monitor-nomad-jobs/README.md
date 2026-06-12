# How to Monitor Nomad Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nomad, Monitoring, Observability, Prometheus, Grafana

Description: Learn how to monitor Nomad jobs using the built-in metrics, Prometheus scraping, and alerts for allocation failures and job health.

---

Nomad exposes detailed metrics for jobs, allocations, and nodes. With Prometheus and Grafana, you can build dashboards and alerts that catch failures early. This guide walks through the core monitoring flow.

## Key Metrics to Track

- Job status and queued vs running allocations
- Allocation failures and restarts
- CPU and memory usage per task
- Node health and resource pressure

## Step 1: Enable Nomad Telemetry

In your Nomad server and client config, enable Prometheus metrics.

```hcl
telemetry {
  collection_interval = "10s"
  disable_hostname = true
  prometheus_metrics = true
  publish_allocation_metrics = true
  publish_node_metrics = true
}
```

Restart Nomad after changes.

## Step 2: Scrape Nomad with Prometheus

Add targets for Nomad servers and clients.

```yaml
scrape_configs:
  - job_name: "nomad"
    metrics_path: /v1/metrics
    params:
      format: ["prometheus"]
    static_configs:
      - targets:
          - "nomad-server-1:4646"
          - "nomad-client-1:4646"
```

The HTTP API is on port `4646`, and Prometheus metrics are exposed at `/v1/metrics?format=prometheus`.

## Step 3: Build Alerts

Example alerts:

- Job has queued allocations
- Allocation restart count spikes
- Task CPU throttling is high

A simple alert for queued allocations:

```yaml
- alert: NomadJobAllocationsQueued
  expr: nomad_nomad_job_summary_queued > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Nomad job has queued allocations"
```

## Step 4: Use Grafana Dashboards

Grafana Labs and the Nomad community publish dashboards you can load, or you can create your own to track:

- Job stability
- Allocation lifecycle
- Host utilization
- Scheduler performance

## Step 5: Job Logs

Nomad can stream logs from allocations:

```bash
nomad alloc logs <alloc-id>
```

Use centralized logging for long-term retention and search.

## Best Practices

- Alert on failed allocations, not just job status.
- Set baselines for CPU and memory per task group.
- Track deployment health during rolling updates.

## Conclusion

Monitoring Nomad jobs is straightforward with Prometheus and Grafana. Focus on allocations, resource pressure, and restart trends to catch failures before they cascade.
