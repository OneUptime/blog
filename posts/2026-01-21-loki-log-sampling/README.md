# How to Implement Log Sampling with Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Log Sampling, Cost Optimization, Promtail, Log Volume, Performance

Description: A comprehensive guide to implementing log sampling strategies with Grafana Loki, covering probabilistic sampling, adaptive sampling, hash-based sampling, and best practices for reducing log volume while maintaining visibility.

---

Log sampling reduces the volume of logs ingested into Loki while preserving statistical significance and visibility into system behavior. When dealing with high-volume logs from verbose applications, sampling can dramatically reduce costs without losing the ability to detect issues and analyze trends. This guide covers various sampling strategies and their implementation.

## Understanding Log Sampling

### Why Sample Logs?

```
┌─────────────────────────────────────────────────────────────────┐
│                    Log Sampling Benefits                         │
│                                                                  │
│  Before Sampling:                                                │
│  - 100 GB/day of logs                                           │
│  - High storage costs                                            │
│  - Slow queries                                                  │
│  - Most logs are routine (INFO/DEBUG)                           │
│                                                                  │
│  After 10% Sampling:                                             │
│  - 10 GB/day of sampled logs + 100% errors                      │
│  - 90% cost reduction                                            │
│  - Faster queries                                                │
│  - Still statistically representative                            │
│  - All errors preserved                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Sampling Strategies

1. **Probabilistic**: Random percentage of logs
2. **Rate-based**: Fixed number of logs per time window
3. **Hash-based**: Consistent sampling based on field values
4. **Adaptive**: Dynamic rate based on volume
5. **Priority-based**: Always keep errors, sample INFO

## Probabilistic Sampling

### Basic Probability Sampling in Promtail

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          __path__: /var/log/app/*.log
    pipeline_stages:
      # Parse log level first
      - json:
          expressions:
            level: level
            message: message

      # Keep all errors and warnings
      - match:
          selector: '{job="app"}'
          stages:
            - regex:
                expression: '(?i)level="?(error|warn)'
            # No drop - keep 100% of errors/warnings

      # Sample INFO logs at 10%
      - match:
          selector: '{job="app"} |~ "(?i)level=\"?info"'
          stages:
            - sampling:
                rate: 0.1  # Keep 10%

      # Sample DEBUG logs at 1%
      - match:
          selector: '{job="app"} |~ "(?i)level=\"?debug"'
          stages:
            - sampling:
                rate: 0.01  # Keep 1%
```

### Drop Stage for Sampling

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level

  # Alternative: Use drop with probability
  - match:
      selector: '{job="app"}'
      stages:
        - drop:
            source: level
            value: info
            drop_counter_reason: info_sampled
            # Sampling via drop_rate
            # Note: This drops 90%, keeping 10%
            # Actual sampling support varies by Promtail version

  # For older Promtail, use regex-based approach
  - match:
      selector: '{job="app"} |~ "level=\"info\""'
      pipeline_name: info_sampling
      stages:
        - sampling:
            rate: 0.1
```

## Hash-Based Sampling

Hash-based sampling ensures consistent sampling - the same request_id or user_id always gets the same sampling decision:

```yaml
# promtail-config.yaml
pipeline_stages:
  - json:
      expressions:
        request_id: request_id
        level: level

  # Hash-based sampling using template
  - template:
      source: sample_hash
      template: '{{ mod (hash .request_id) 100 }}'

  # Keep if hash < 10 (10% sample)
  - match:
      selector: '{job="app"}'
      stages:
        - template:
            source: should_keep
            template: '{{ if lt (atoi .sample_hash) 10 }}true{{ else }}false{{ end }}'

  # Drop logs that shouldn't be kept (for INFO only)
  - match:
      selector: '{job="app"}'
      stages:
        - drop:
            source: should_keep
            expression: 'false'
            drop_counter_reason: hash_sampled
```

### Consistent Sampling by Trace ID

```yaml
pipeline_stages:
  - json:
      expressions:
        trace_id: trace_id
        level: level

  # For distributed tracing: sample entire traces consistently
  - template:
      source: trace_sample
      template: '{{ if hasSuffix (slice .trace_id -2) "0" }}keep{{ else }}sample{{ end }}'
      # Keeps traces ending in "0" (~6.25% sample by last hex digit)

  # Keep sampled traces
  - match:
      selector: '{job="app"}'
      stages:
        - drop:
            source: trace_sample
            value: sample
            drop_counter_reason: trace_sampled
```

## Rate-Based Sampling

Limit logs to a fixed rate per time window:

```yaml
# promtail-config.yaml
pipeline_stages:
  - json:
      expressions:
        level: level

  # Use limit stage for rate-based sampling
  - limit:
      rate: 100  # logs per second
      burst: 200
      drop: true
      by_label_name: service  # Rate limit per service
```

### Implementation with Counter

```yaml
# This is a conceptual example - actual implementation depends on Promtail version
pipeline_stages:
  - json:
      expressions:
        level: level
        service: service

  # Rate limit by service
  - match:
      selector: '{job="app"} |= "INFO"'
      stages:
        - limit:
            rate: 50  # 50 logs/second per service
            burst: 100
            by_label_name: service
```

## Adaptive Sampling

Adjust sampling rate based on current volume:

```yaml
# This requires custom logic or external controller
# Conceptual configuration:

# High volume (>1000 logs/s): 1% sample
# Medium volume (100-1000 logs/s): 10% sample
# Low volume (<100 logs/s): 100% keep

# Implementation typically done at application level
# or with a sampling proxy
```

### Application-Level Adaptive Sampling

```python
# Python example - adaptive sampling in application
import random
import time
from collections import deque

class AdaptiveSampler:
    def __init__(self, target_rate=100):  # target logs per second
        self.target_rate = target_rate
        self.window = deque(maxlen=1000)
        self.sample_rate = 1.0

    def should_sample(self, level):
        # Always keep errors
        if level in ['ERROR', 'CRITICAL']:
            return True

        now = time.time()
        self.window.append(now)

        # Calculate current rate
        if len(self.window) >= 2:
            duration = self.window[-1] - self.window[0]
            if duration > 0:
                current_rate = len(self.window) / duration
                # Adjust sample rate
                if current_rate > self.target_rate:
                    self.sample_rate = self.target_rate / current_rate
                else:
                    self.sample_rate = min(1.0, self.sample_rate + 0.1)

        return random.random() < self.sample_rate

sampler = AdaptiveSampler(target_rate=100)

# Usage in logging
if sampler.should_sample(log_level):
    logger.info(message)
```

## Priority-Based Sampling

Keep important logs, sample routine ones:

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            error_type: error_type
            endpoint: endpoint

      # Priority 1: Always keep errors and warnings
      - match:
          selector: '{job="app"} |~ "(?i)(error|warn|critical|fatal)"'
          action: keep

      # Priority 2: Always keep slow requests
      - match:
          selector: '{job="app"}'
          stages:
            - json:
                expressions:
                  duration: duration
            - match:
                selector: '{job="app"}'
                stages:
                  # Keep if duration > 5 seconds
                  - template:
                      source: is_slow
                      template: '{{ if gt .duration 5.0 }}true{{ else }}false{{ end }}'

      # Priority 3: Always keep specific endpoints
      - match:
          selector: '{job="app"} |~ "endpoint=\"(/api/payment|/api/auth)\""'
          action: keep

      # Priority 4: Sample everything else at 10%
      - match:
          selector: '{job="app"} |~ "(?i)level=\"?info\""'
          stages:
            - sampling:
                rate: 0.1

      # Priority 5: Drop debug in production
      - match:
          selector: '{job="app"} |~ "(?i)level=\"?debug\""'
          stages:
            - drop:
                drop_counter_reason: debug_dropped
```

## Sampling with Labels

Add sampling information as labels or metadata:

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level

  # Add sampling label
  - template:
      source: sampled
      template: '{{ if eq .level "info" }}true{{ else }}false{{ end }}'

  - labels:
      sampled:

  # Later, when querying, you know which logs were sampled
  # {job="app", sampled="true"} means these are sampled
  # {job="app", sampled="false"} means these are 100% coverage
```

## Monitoring Sampling Effectiveness

### Promtail Metrics

```promql
# Total logs read
rate(promtail_read_lines_total[5m])

# Logs sent after sampling
rate(promtail_sent_entries_total[5m])

# Effective sample rate
rate(promtail_sent_entries_total[5m]) / rate(promtail_read_lines_total[5m])

# Dropped by sampling
rate(promtail_dropped_entries_total{reason="info_sampled"}[5m])
```

### Dashboard for Sampling

```json
{
  "dashboard": {
    "title": "Log Sampling Metrics",
    "panels": [
      {
        "title": "Sample Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(promtail_sent_entries_total[5m]) / rate(promtail_read_lines_total[5m]) * 100"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "max": 100
          }
        }
      },
      {
        "title": "Logs Dropped by Reason",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (reason) (rate(promtail_dropped_entries_total[5m]))",
            "legendFormat": "{{reason}}"
          }
        ]
      },
      {
        "title": "Before vs After Sampling",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(promtail_read_lines_total[5m])",
            "legendFormat": "Read (before)"
          },
          {
            "expr": "rate(promtail_sent_entries_total[5m])",
            "legendFormat": "Sent (after)"
          }
        ]
      }
    ]
  }
}
```

## Best Practices

### What to Sample

| Log Type | Recommended Sample Rate | Reason |
|----------|------------------------|--------|
| ERROR/CRITICAL | 100% (never sample) | Critical for debugging |
| WARNING | 100% | Important signals |
| INFO - slow requests | 100% | Performance issues |
| INFO - auth events | 100% | Security audit |
| INFO - routine | 1-10% | High volume, predictable |
| DEBUG | 0-1% | Usually not needed in prod |
| Access logs | 10-50% | Depends on traffic |
| Health checks | 0% (drop) | No value |

### Statistical Validity

For sampled logs to be statistically valid:

```
Minimum sample size for 95% confidence, 5% margin:
n = (Z^2 * p * (1-p)) / E^2
n = (1.96^2 * 0.5 * 0.5) / 0.05^2
n = 385 samples minimum

For 100,000 events/hour:
- 1% sample = 1,000 events (statistically valid)
- 0.1% sample = 100 events (marginal)
```

### Maintain Context

```yaml
# When sampling, ensure correlated logs stay together
pipeline_stages:
  - json:
      expressions:
        trace_id: trace_id
        span_id: span_id

  # Sample by trace_id to keep entire traces
  - template:
      source: trace_bucket
      template: '{{ mod (hash .trace_id) 10 }}'

  # Keep traces in bucket 0 (10% sample)
  - match:
      selector: '{job="app"}'
      stages:
        - drop:
            source: trace_bucket
            expression: '[1-9]'
            drop_counter_reason: trace_sampled
```

## Conclusion

Log sampling is an effective strategy for managing high-volume logs while maintaining visibility and statistical validity. By implementing priority-based sampling that preserves all errors and samples routine logs, you can significantly reduce costs without compromising your ability to troubleshoot and analyze system behavior.

Key takeaways:
- Never sample errors, warnings, or security-relevant logs
- Use hash-based sampling for consistent trace sampling
- Implement priority tiers for different log types
- Monitor sample rates and dropped log counts
- Ensure statistical validity for sampled metrics
- Document sampling policies for your team
