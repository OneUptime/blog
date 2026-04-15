# How to Monitor AI Agent Performance with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Monitoring, Observability, Prometheus

Description: Learn how to monitor Dapr AI agents using built-in metrics, distributed tracing, and custom performance metrics for LLM latency and token usage.

---

## Why Monitor AI Agents?

AI agents have unique performance characteristics compared to typical microservices:

- LLM call latency varies from 1 to 30+ seconds
- Token usage directly affects cost
- Tool call failures can cascade across multi-step workflows
- Queue depth indicates backpressure on agent pools

Dapr provides built-in metrics and tracing that combine with custom agent instrumentation for comprehensive observability.

## Enabling Dapr Metrics

Configure Prometheus metrics scraping in the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: agent-observability-config
spec:
  metric:
    enabled: true
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin.monitoring:9411/api/v2/spans"
```

Annotate your deployment to expose metrics:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "research-agent"
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"
```

## Key Dapr Metrics for Agents

Dapr exposes these agent-relevant metrics:

```bash
# Service invocation latency
dapr_http_server_request_count
dapr_http_server_latency

# Actor metrics (for actor-based agents)
dapr_runtime_actor_pending_actor_calls
dapr_runtime_actor_timers_fired_total
dapr_runtime_actor_reminders_fired_total

# Pub/sub metrics
dapr_component_pubsub_ingress_count
dapr_component_pubsub_egress_count
```

## Adding Custom LLM Metrics

Instrument your agent code with custom metrics using Prometheus client:

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# LLM call metrics
llm_calls_total = Counter(
    "agent_llm_calls_total",
    "Total LLM API calls",
    ["model", "status"]
)
llm_latency = Histogram(
    "agent_llm_latency_seconds",
    "LLM API call latency",
    ["model"],
    buckets=[0.5, 1, 2, 5, 10, 30, 60]
)
llm_tokens_used = Counter(
    "agent_llm_tokens_total",
    "Total tokens consumed",
    ["model", "type"]
)
active_tasks = Gauge(
    "agent_active_tasks",
    "Number of tasks currently being processed"
)

# Instrument your agent calls
class InstrumentedAgent:
    def run(self, message: str) -> str:
        active_tasks.inc()
        start = time.time()
        model = "gpt-4o"

        try:
            result = self._call_llm(message)
            llm_calls_total.labels(model=model, status="success").inc()
            llm_tokens_used.labels(model=model, type="input").inc(result.usage.prompt_tokens)
            llm_tokens_used.labels(model=model, type="output").inc(result.usage.completion_tokens)
            return result.text
        except Exception as e:
            llm_calls_total.labels(model=model, status="error").inc()
            raise
        finally:
            llm_latency.labels(model=model).observe(time.time() - start)
            active_tasks.dec()

# Start metrics server on a separate port
start_http_server(9091)
```

## Prometheus Scrape Configuration

Add your custom metrics endpoint to Prometheus:

```yaml
scrape_configs:
  - job_name: "dapr-agents"
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

## Grafana Dashboard Queries

Sample PromQL queries for an agent dashboard:

```promql
# Average LLM latency over 5 minutes
rate(agent_llm_latency_seconds_sum[5m]) / rate(agent_llm_latency_seconds_count[5m])

# LLM error rate
rate(agent_llm_calls_total{status="error"}[5m]) / rate(agent_llm_calls_total[5m])

# Token consumption rate (cost tracking)
rate(agent_llm_tokens_total[1h]) * 60
```

## Distributed Tracing for Agent Workflows

With Zipkin or Jaeger configured, Dapr automatically traces:
- Service invocation calls
- Pub/sub publish and subscribe operations
- State store reads and writes

View traces in Jaeger:

```bash
kubectl port-forward svc/jaeger-query 16686:16686 -n monitoring
open http://localhost:16686
```

Filter by service name `research-agent` to see full agent execution traces.

## Summary

Monitor Dapr AI agents by enabling Dapr's built-in Prometheus metrics for service invocation, actors, and pub/sub, then add custom metrics for LLM latency, token usage, and active task counts. Use PromQL queries in Grafana to build dashboards tracking agent performance and cost, and enable distributed tracing to visualize multi-step agent workflows end-to-end.
