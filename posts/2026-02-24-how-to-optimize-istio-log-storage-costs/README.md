# How to Optimize Istio Log Storage Costs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Logging, Cost Optimization, Observability, Kubernetes

Description: How to control the volume and storage costs of Istio-generated access logs through filtering, sampling, format optimization, and retention policies.

---

Access logs from Istio sidecars can be one of the most expensive parts of running a service mesh. Every HTTP request and TCP connection that passes through an Envoy sidecar can generate a log line. For a platform handling 10 million requests per day, that is 10 million log lines, each consuming 500-1000 bytes. At that rate you are looking at 5-10 GB of logs per day, or 150-300 GB per month.

If you are shipping those logs to Elasticsearch, Splunk, or a managed logging service, the cost adds up fast. Elasticsearch storage runs $0.30-1.00/GB depending on your setup. Splunk charges by ingestion volume. Datadog charges per indexed log event.

The good news is that you have a lot of control over what gets logged, how it gets formatted, and how long it gets retained.

## Start by Measuring Current Log Volume

Before optimizing, understand what you are dealing with:

```bash
# Estimate log volume from a single pod
kubectl logs deploy/your-service -c istio-proxy --since=1h | wc -c
```

Or use Prometheus if you track log ingestion:

```promql
# Bytes of logs produced per second across all sidecars
sum(rate(container_log_logged_bytes_total{container="istio-proxy"}[5m]))
```

Multiply the hourly volume by 24 and then by 30 to get your monthly estimate.

## Option 1: Disable Access Logging Entirely

The most effective cost reduction is to turn off access logging:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: ""
```

Setting `accessLogFile` to an empty string disables access logging for all sidecars. You still get metrics from Prometheus and tracing data if configured, which covers most observability needs.

This is a valid choice for many teams. Metrics tell you request rates, error rates, and latencies. Traces tell you the path of individual requests. Access logs add the most value when you need to debug specific requests with full headers and response details, and you can enable them temporarily when needed.

## Option 2: Enable Logging Only for Specific Namespaces

Use the Telemetry API to enable access logging selectively:

```yaml
# Disable globally
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: disable-global-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
    disabled: true
---
# Enable for specific namespace
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: enable-logging
  namespace: production-critical
spec:
  accessLogging:
  - providers:
    - name: envoy
    disabled: false
```

This keeps logging active only for namespaces where you really need it, like production services handling customer traffic or services under active debugging.

## Option 3: Log Only Errors

You can filter access logs to only capture failed requests using the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: error-only-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
```

This logs only requests that returned a 4xx or 5xx status code. For a healthy service with 99.9% success rate, this reduces log volume by 99.9%.

You can also filter on other conditions:

```yaml
# Log only server errors (5xx)
filter:
  expression: "response.code >= 500"

# Log slow requests
filter:
  expression: "response.duration > duration('1s')"

# Log errors OR slow requests
filter:
  expression: "response.code >= 500 || response.duration > duration('1s')"
```

## Option 4: Reduce Log Line Size

If you need full access logging, reduce the size of each log line by customizing the format.

The default Istio access log format includes many fields you might not need. Create a minimal format:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "ts": "%START_TIME%",
        "src": "%DOWNSTREAM_REMOTE_ADDRESS%",
        "dst": "%UPSTREAM_HOST%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(PATH)%",
        "code": "%RESPONSE_CODE%",
        "dur": "%DURATION%",
        "bytes_in": "%BYTES_RECEIVED%",
        "bytes_out": "%BYTES_SENT%"
      }
```

This minimal format captures the essentials (timestamp, source, destination, method, path, response code, duration, and bytes) in about 200 bytes per line instead of the default 500-800 bytes. That is a 60-75% reduction in log volume with the same core information.

Short field names (`ts`, `src`, `dst`, `dur`) also save bytes. When you are generating millions of log lines, every byte counts.

## Option 5: Use TEXT Encoding Instead of JSON

JSON encoding adds formatting overhead (quotes, braces, colons). If your log pipeline can handle plain text, switch to text encoding:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: TEXT
```

Text-encoded logs are typically 30-40% smaller than JSON. The tradeoff is that they are harder to parse in some log aggregation systems.

## Option 6: Sample Access Logs

If you want access logs for debugging but do not need every single request, implement sampling. Istio does not have built-in access log sampling, but you can achieve it with the Telemetry API filter:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: sampled-logging
  namespace: production
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400 || request.id.substring(0, 2) == '0a'"
```

The `request.id.substring(0, 2) == '0a'` expression samples roughly 1/256 of requests (assuming request IDs are hex-encoded UUIDs). Combined with logging all errors, this gives you a representative sample of normal traffic plus complete error coverage.

## Retention Policies

Do not keep access logs forever. Set up retention policies based on your compliance and debugging needs:

For Elasticsearch:

```json
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "2d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "delete": {
        "min_age": "14d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

This keeps logs hot for 1 day, warm for 2 weeks, then deletes them. Adjust based on your needs, but 14-30 days is sufficient for most debugging scenarios.

## Cold Storage for Compliance

If regulations require long-term log retention, archive to cheap storage:

```bash
# Ship logs older than 7 days to S3
# Configure your log shipper (Fluentd, Vector, etc.) with:
```

For Fluentd:

```yaml
<match istio.access.**>
  @type s3
  s3_bucket istio-access-logs-archive
  s3_region us-east-1
  path logs/%Y/%m/%d/
  time_slice_format %Y%m%d%H
  store_as gzip
  <buffer time>
    timekey 1h
    timekey_wait 10m
  </buffer>
</match>
```

Gzipped access logs on S3 cost about $0.023/GB, compared to $0.30-1.00/GB on Elasticsearch. For compliance archives that you rarely query, this is a 90%+ cost reduction.

## Cost Impact Summary

Here is a realistic example for a platform doing 10M requests/day:

| Strategy | Daily Log Volume | Monthly Cost (ES) |
|---|---|---|
| Default (all logs, JSON) | 8 GB | $240 |
| Minimal format | 3 GB | $90 |
| Errors only | 0.08 GB | $2.40 |
| Disabled (use metrics/traces) | 0 GB | $0 |
| Sampled (1%) + errors | 0.16 GB | $4.80 |

## Summary

Istio log cost optimization comes down to logging less and logging smarter. Start by asking what you actually use access logs for. If the answer is "debugging errors," then log only errors. If you need a general sample for traffic analysis, sample at 1-5%. If you only need metrics and traces, turn off access logging entirely. Whatever you keep, use a minimal format and aggressive retention policies. The difference between default logging and optimized logging can easily be $200+/month per cluster.
