# How to Configure Prometheus Scrape Intervals and Timeout Tuning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Performance, Configuration, Kubernetes, Monitoring

Description: Learn how to optimize Prometheus scrape intervals and timeouts to balance data freshness, resource usage, and system reliability.

---

Prometheus scrape configuration directly impacts monitoring accuracy, resource consumption, and system load. Scrape intervals determine how frequently Prometheus collects metrics, while timeouts control how long to wait for responses. Setting these values incorrectly leads to missed metrics, resource waste, or target overload. This guide covers strategies for optimizing scrape configuration based on workload characteristics.

## Understanding Scrape Configuration

Prometheus scrapes metrics from targets at regular intervals. Each scrape:
- Opens an HTTP connection to the target
- Fetches metrics from the /metrics endpoint
- Parses and stores the metrics
- Closes the connection

Key parameters:
- **scrape_interval**: How often to scrape (default: 1m)
- **scrape_timeout**: Maximum time for a scrape (default: 10s)
- **evaluation_interval**: How often to evaluate rules (default: 1m)

The relationship: `scrape_timeout < scrape_interval`

## Setting Global Defaults

Configure global scrape settings in Prometheus:

```yaml
# prometheus-values.yaml (for kube-prometheus-stack)
prometheus:
  prometheusSpec:
    # Global scrape interval
    scrapeInterval: 30s

    # Global scrape timeout
    scrapeTimeout: 10s

    # Rule evaluation interval
    evaluationInterval: 30s

    # Resource limits based on scrape frequency
    resources:
      requests:
        cpu: 1000m
        memory: 4Gi
      limits:
        cpu: 4000m
        memory: 8Gi
```

## Per-Target Scrape Configuration

Override global settings for specific targets:

```yaml
# fast-scraping-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: high-frequency-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: trading-engine
  endpoints:
    - port: metrics
      interval: 5s  # Fast scraping for critical metrics
      scrapeTimeout: 3s
      path: /metrics
```

Slower scraping for less critical metrics:

```yaml
# slow-scraping-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: low-frequency-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: batch-processor
  endpoints:
    - port: metrics
      interval: 5m  # Slow scraping for batch jobs
      scrapeTimeout: 30s
      path: /metrics
```

## Scrape Interval Guidelines

Choose intervals based on metric characteristics:

**5-15 seconds**: High-frequency, time-sensitive metrics
- Real-time trading systems
- Gaming servers
- Live video streaming metrics
- Financial transaction processing

```yaml
endpoints:
  - port: metrics
    interval: 10s
    scrapeTimeout: 5s
```

**30 seconds**: Standard application metrics (recommended default)
- Web applications
- APIs
- Microservices
- Database metrics

```yaml
endpoints:
  - port: metrics
    interval: 30s
    scrapeTimeout: 10s
```

**1-2 minutes**: Infrastructure metrics
- Node exporters
- Cluster-level metrics
- Network devices
- Storage systems

```yaml
endpoints:
  - port: metrics
    interval: 60s
    scrapeTimeout: 15s
```

**5-15 minutes**: Slow-changing or expensive metrics
- Batch job metrics
- Long-running processes
- Expensive queries
- External system metrics

```yaml
endpoints:
  - port: metrics
    interval: 5m
    scrapeTimeout: 60s
```

## Timeout Configuration

Set timeouts appropriately for target characteristics:

**Short timeouts (3-5s)**: Fast endpoints
```yaml
endpoints:
  - port: metrics
    interval: 15s
    scrapeTimeout: 5s  # Fail fast for quick endpoints
```

**Medium timeouts (10-15s)**: Standard applications
```yaml
endpoints:
  - port: metrics
    interval: 30s
    scrapeTimeout: 10s  # Default, works for most cases
```

**Long timeouts (30-60s)**: Expensive or slow endpoints
```yaml
endpoints:
  - port: metrics
    interval: 2m
    scrapeTimeout: 45s  # Wait longer for complex metrics
```

## Configuring for Different Workloads

### High-Cardinality Metrics

For endpoints exposing many time series:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: high-cardinality-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      metrics: high-cardinality
  endpoints:
    - port: metrics
      interval: 60s  # Longer interval to reduce load
      scrapeTimeout: 30s  # Longer timeout for large responses
      path: /metrics

      # Optionally limit series
      sampleLimit: 50000  # Drop scrape if more than 50k series
```

### Low-Latency Applications

For applications requiring fast detection:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: low-latency-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: api-gateway
  endpoints:
    - port: metrics
      interval: 15s  # Quick detection of issues
      scrapeTimeout: 5s  # Fast timeout to avoid blocking
      path: /metrics

      # Use metric relabeling to reduce data
      metricRelabelings:
        - sourceLabels: [__name__]
          regex: '(http_requests_total|http_request_duration_.*)'
          action: keep
```

### Batch Processing

For batch jobs and cron tasks:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: batch-job-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      job-type: batch
  podMetricsEndpoints:
    - port: metrics
      interval: 2m  # Infrequent scraping
      scrapeTimeout: 60s  # Long timeout for processing time
      path: /metrics
```

### Federated Prometheus

For federation endpoints:

```yaml
prometheus:
  prometheusSpec:
    additionalScrapeConfigs:
      - job_name: 'federate'
        scrape_interval: 60s  # Longer for federation
        scrape_timeout: 30s
        honor_labels: true
        metrics_path: '/federate'
        params:
          'match[]':
            - '{job="kubernetes-nodes"}'
        static_configs:
          - targets:
              - 'prometheus-cluster-1:9090'
              - 'prometheus-cluster-2:9090'
```

## Monitoring Scrape Performance

Track scrape duration and success:

```promql
# Scrape duration by job
scrape_duration_seconds{job="my-app"}

# Scrape samples by job
scrape_samples_scraped{job="my-app"}

# Failed scrapes
up{job="my-app"} == 0

# Scrapes exceeding timeout
rate(prometheus_target_scrapes_exceeded_sample_limit_total[5m])
```

Create alerts for scrape issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: scrape-alerts
  namespace: monitoring
spec:
  groups:
    - name: scraping
      interval: 30s
      rules:
        - alert: ScrapeTooSlow
          expr: |
            scrape_duration_seconds > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Scraping {{ $labels.job }} is slow"
            description: "Scrape takes {{ $value }}s, may need timeout adjustment."

        - alert: ScrapeTimeout
          expr: |
            up == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Scraping {{ $labels.job }} is failing"
            description: "Target {{ $labels.instance }} is down or timing out."

        - alert: HighScrapeVolume
          expr: |
            scrape_samples_scraped > 50000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High sample count from {{ $labels.job }}"
            description: "Scraping {{ $value }} samples, may need filtering."

        - alert: ScrapeExceedsSampleLimit
          expr: |
            rate(prometheus_target_scrapes_exceeded_sample_limit_total[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Scrape exceeds sample limit"
            description: "Job {{ $labels.job }} is dropping samples."
```

## Optimizing Prometheus Resources

Calculate required resources based on scrape frequency:

```yaml
# Estimate:
# Targets: 1000
# Metrics per target: 1000
# Scrape interval: 30s
# Retention: 15 days

# Total series: 1000 targets * 1000 metrics = 1M series
# Samples per second: 1M series / 30s = 33,333 samples/s
# Daily samples: 33,333 * 86,400 = 2.88B samples/day
# Memory estimate: 1M series * 3KB = 3GB

prometheus:
  prometheusSpec:
    scrapeInterval: 30s
    retention: 15d

    resources:
      requests:
        cpu: 2000m
        memory: 8Gi  # 3GB + overhead
      limits:
        cpu: 4000m
        memory: 16Gi

    # Storage
    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 100Gi  # 15 days * 2.88B * 2 bytes
```

## Sample Limit Configuration

Protect Prometheus from scrape explosions:

```yaml
prometheus:
  prometheusSpec:
    # Global sample limit per scrape
    enforcedSampleLimit: 100000

    # Per-target sample limit
    additionalScrapeConfigs:
      - job_name: 'my-app'
        sample_limit: 50000  # Fail scrape if exceeded
        scrape_interval: 30s
```

Per-ServiceMonitor limits:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: limited-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 30s
      sampleLimit: 10000  # Drop scrape if more than 10k samples
```

## Testing Scrape Configuration

Test scrape performance before deploying:

```bash
# Manually scrape an endpoint
curl http://my-app:8080/metrics

# Time the scrape
time curl http://my-app:8080/metrics > /dev/null

# Count metrics
curl -s http://my-app:8080/metrics | grep -c "^[a-z]"

# Check metric size
curl -s http://my-app:8080/metrics | wc -c
```

Use promtool to validate:

```bash
# Check Prometheus config
kubectl exec -n monitoring prometheus-pod -- \
  promtool check config /etc/prometheus/prometheus.yml
```

## Dynamic Scrape Adjustment

Adjust scrape intervals based on load:

```yaml
# Use different intervals for prod vs non-prod
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: environment-aware-scraping
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      # Production: fast scraping
      interval: "{{ if eq .Values.environment \"production\" }}30s{{ else }}2m{{ end }}"
      scrapeTimeout: "{{ if eq .Values.environment \"production\" }}10s{{ else }}30s{{ end }}"
```

## Best Practices

1. Use 30s as the default scrape interval for most applications
2. Increase interval for expensive or high-cardinality endpoints
3. Set scrape_timeout to less than scrape_interval
4. Monitor scrape_duration_seconds to identify slow targets
5. Use sample limits to protect against metric explosions
6. Adjust intervals based on metric change frequency
7. Test scrape performance before production deployment
8. Alert on scrape failures and slow scrapes
9. Document scrape configuration decisions
10. Review and optimize scrape intervals quarterly

## Conclusion

Proper scrape interval and timeout configuration balances data freshness, resource efficiency, and system reliability. By matching scrape frequency to metric characteristics, you optimize Prometheus performance while maintaining monitoring accuracy. Regular monitoring of scrape metrics and thoughtful tuning ensure your observability stack scales with your infrastructure.
