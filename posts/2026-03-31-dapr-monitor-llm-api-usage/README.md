# How to Monitor LLM API Usage with Dapr Conversation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Monitoring, LLM, Observability, Cost

Description: Learn how to monitor LLM API usage, token consumption, costs, and latency when using the Dapr Conversation API in microservices with Prometheus and dashboards.

---

Monitoring LLM API usage is critical for controlling costs, ensuring SLAs, and detecting anomalies. Dapr Conversation exposes metrics via the Dapr sidecar, and you can add application-level tracking to measure token usage, latency, and cost per request.

## Tracking Usage with Middleware

Create a middleware wrapper that logs metrics for every Conversation API call:

```python
import requests
import time
import logging
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)
DAPR_URL = "http://localhost:3500"

@dataclass
class ConversationMetrics:
    component: str
    input_tokens: int
    output_tokens: int
    latency_ms: float
    model: str
    success: bool
    error: Optional[str] = None

def tracked_conversation(component: str, inputs: list, params: dict = None) -> tuple:
    """Call Dapr Conversation and return (result, metrics)."""
    start_time = time.time()

    try:
        response = requests.post(
            f"{DAPR_URL}/v1.0-alpha1/conversation/{component}/converse",
            json={"inputs": inputs, "parameters": params or {}}
        )
        response.raise_for_status()
        data = response.json()

        latency_ms = (time.time() - start_time) * 1000
        result = data['outputs'][0]['result']

        # Estimate token counts (4 chars ~ 1 token approximation)
        input_text = " ".join(i['message'] for i in inputs)
        metrics = ConversationMetrics(
            component=component,
            input_tokens=len(input_text) // 4,
            output_tokens=len(result) // 4,
            latency_ms=latency_ms,
            model=params.get('model', 'default') if params else 'default',
            success=True
        )

        record_metrics(metrics)
        return result, metrics

    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        metrics = ConversationMetrics(
            component=component,
            input_tokens=0,
            output_tokens=0,
            latency_ms=latency_ms,
            model='unknown',
            success=False,
            error=str(e)
        )
        record_metrics(metrics)
        raise

def record_metrics(metrics: ConversationMetrics):
    # Store aggregated metrics in Dapr State
    requests.post(
        f"{DAPR_URL}/v1.0/state/statestore",
        json=[{
            "key": f"llm-usage:{metrics.component}:{int(time.time())}",
            "value": {
                "component": metrics.component,
                "inputTokens": metrics.input_tokens,
                "outputTokens": metrics.output_tokens,
                "latencyMs": metrics.latency_ms,
                "success": metrics.success,
                "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            },
            "metadata": {"ttlInSeconds": "86400"}  # Retain 24 hours
        }]
    )

    # Log for aggregation by your logging stack
    logger.info(
        f"LLM call: component={metrics.component} "
        f"tokens={metrics.input_tokens}+{metrics.output_tokens} "
        f"latency={metrics.latency_ms:.0f}ms "
        f"success={metrics.success}"
    )
```

## Prometheus Metrics for LLM Usage

Expose Prometheus metrics from your application:

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server

LLM_REQUESTS = Counter(
    'llm_requests_total',
    'Total LLM API requests',
    ['component', 'success']
)
LLM_TOKENS = Counter(
    'llm_tokens_total',
    'Total LLM tokens consumed',
    ['component', 'type']  # type: input or output
)
LLM_LATENCY = Histogram(
    'llm_request_duration_seconds',
    'LLM request latency',
    ['component'],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)
LLM_COST_ESTIMATE = Counter(
    'llm_cost_dollars_total',
    'Estimated LLM cost in USD',
    ['component']
)

start_http_server(9090)

# Cost estimates per 1M tokens (update with current pricing)
COST_PER_MILLION_INPUT = {
    "openai-conversation": 2.50,
    "anthropic-conversation": 3.00,
    "mistral-conversation": 0.70
}
COST_PER_MILLION_OUTPUT = {
    "openai-conversation": 10.00,
    "anthropic-conversation": 15.00,
    "mistral-conversation": 0.70
}

def record_prometheus_metrics(metrics: ConversationMetrics):
    LLM_REQUESTS.labels(
        component=metrics.component,
        success=str(metrics.success)
    ).inc()

    if metrics.success:
        LLM_TOKENS.labels(
            component=metrics.component, type='input'
        ).inc(metrics.input_tokens)
        LLM_TOKENS.labels(
            component=metrics.component, type='output'
        ).inc(metrics.output_tokens)
        LLM_LATENCY.labels(
            component=metrics.component
        ).observe(metrics.latency_ms / 1000)

        # Estimate cost
        input_cost = (metrics.input_tokens / 1_000_000) * \
            COST_PER_MILLION_INPUT.get(metrics.component, 0)
        output_cost = (metrics.output_tokens / 1_000_000) * \
            COST_PER_MILLION_OUTPUT.get(metrics.component, 0)
        LLM_COST_ESTIMATE.labels(
            component=metrics.component
        ).inc(input_cost + output_cost)
```

## Grafana Dashboard Queries

Key Prometheus queries for an LLM usage dashboard:

```text
# Request rate per minute
rate(llm_requests_total[1m])

# Token consumption rate
rate(llm_tokens_total[5m])

# P95 latency
histogram_quantile(0.95, rate(llm_request_duration_seconds_bucket[5m]))

# Estimated daily cost
increase(llm_cost_dollars_total[24h])

# Error rate
rate(llm_requests_total{success="False"}[5m]) /
rate(llm_requests_total[5m])
```

## Summary

Monitoring LLM API usage with Dapr Conversation requires application-level instrumentation since LLM token counts and costs are domain-specific. Wrapping Conversation API calls with metrics tracking, exposing Prometheus metrics, and visualizing cost and latency in Grafana gives you complete visibility into your AI infrastructure spending and performance.
