# How to Use Change Failure Rate Tracking with OpenTelemetry and DORA Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, DORA Metric, Change Failure Rate, DevOps

Description: Build automated Change Failure Rate measurement using OpenTelemetry to track one of the four key DORA metrics for engineering performance.

Change Failure Rate (CFR), also called Change Fail Rate in current DORA guidance, is one of the DORA metrics that measure software delivery performance. It answers a specific question: what percentage of deployments require immediate intervention following a deployment? Tracking this metric manually through spreadsheets or ticket labels is unreliable. OpenTelemetry provides the instrumentation to capture both sides of the equation - deployments and their outcomes - automatically and accurately.

## What Counts as a "Failed Change"

Before measuring CFR, your team needs a clear definition. DORA defines Change Fail Rate as the ratio of deployments that require immediate intervention following deployment, likely resulting in a rollback or hotfix. In OpenTelemetry terms, a change is "failed" if any of these conditions occur within a defined window after deployment:

- Error rate increases by more than a threshold (e.g., 2x baseline)
- A rollback is triggered
- Latency p99 degrades by more than a defined percentage
- An incident is opened and linked to the deployment

## Recording Deployment Events

Every deployment must be recorded as a structured metric data point in your telemetry pipeline. This is the numerator and denominator source for CFR.

```python
# Record every deployment with outcome tracking

from opentelemetry import metrics
from datetime import datetime, timezone

meter = metrics.get_meter("dora.metrics")

# Counter for total deployments
deployments_total = meter.create_counter(
    "dora.deployments.total",
    description="Total number of deployments",
    unit="1"
)

# Counter for failed deployments
deployments_failed = meter.create_counter(
    "dora.deployments.failed",
    description="Deployments that resulted in degraded service",
    unit="1"
)

class DeploymentRecorder:
    def __init__(self):
        self.pending_deployments = {}

    def record_deployment(self, deploy_id, service, version, environment):
        """Called when a deployment completes."""
        deployments_total.add(1, attributes={
            "service.name": service,
            "deployment.environment.name": environment,
            "service.version": version,
        })

        # Track this deployment for outcome evaluation
        self.pending_deployments[deploy_id] = {
            "service": service,
            "version": version,
            "environment": environment,
            "deployed_at": datetime.now(timezone.utc),
            "outcome": "pending"
        }

    def mark_failed(self, deploy_id, failure_reason):
        """Called when a deployment is determined to have failed."""
        deploy = self.pending_deployments.get(deploy_id)
        if deploy and deploy["outcome"] == "pending":
            deploy["outcome"] = "failed"
            deploy["failure_reason"] = failure_reason

            deployments_failed.add(1, attributes={
                "service.name": deploy["service"],
                "deployment.environment.name": deploy["environment"],
                "failure.reason": failure_reason,
            })

    def mark_successful(self, deploy_id):
        """Called when a deployment passes the evaluation window without issues."""
        deploy = self.pending_deployments.get(deploy_id)
        if deploy and deploy["outcome"] == "pending":
            deploy["outcome"] = "successful"
```

## Automated Failure Detection

The core challenge is automatically determining whether a deployment failed. This evaluator watches OpenTelemetry metrics after each deployment and classifies the outcome.

```python
# Automated deployment outcome evaluator
import requests
from datetime import timedelta

class DeploymentEvaluator:
    # How long to monitor after a deployment before declaring success
    EVALUATION_WINDOW = timedelta(minutes=30)

    # Thresholds for declaring failure
    ERROR_RATE_MULTIPLIER = 2.0    # 2x increase in error rate
    LATENCY_P99_MULTIPLIER = 1.5   # 50% increase in p99 latency

    def evaluate(self, deployment, prometheus_url):
        """
        Compare post-deploy metrics against pre-deploy baseline.
        Returns 'failed' or 'successful'.
        """
        service = deployment["service"]
        deploy_time = deployment["deployed_at"]

        # Define time windows
        pre_start = deploy_time - timedelta(hours=1)
        pre_end = deploy_time
        post_start = deploy_time
        post_end = deploy_time + self.EVALUATION_WINDOW

        # Check error rate change
        pre_error_rate = self._query_error_rate(
            prometheus_url, service, pre_start, pre_end
        )
        post_error_rate = self._query_error_rate(
            prometheus_url, service, post_start, post_end
        )

        if pre_error_rate > 0 and post_error_rate / pre_error_rate > self.ERROR_RATE_MULTIPLIER:
            return "failed", "error_rate_increase"

        # Check latency degradation
        pre_latency = self._query_p99_latency(
            prometheus_url, service, pre_start, pre_end
        )
        post_latency = self._query_p99_latency(
            prometheus_url, service, post_start, post_end
        )

        if pre_latency > 0 and post_latency / pre_latency > self.LATENCY_P99_MULTIPLIER:
            return "failed", "latency_degradation"

        # Check if a rollback occurred
        if self._rollback_detected(service, post_start, post_end):
            return "failed", "rollback"

        return "successful", None

    def _query_error_rate(self, prometheus_url, service, start, end):
        query = (
            f'sum(rate(http_server_request_duration_seconds_count'
            f'{{service_name="{service}",http_response_status_code=~"5.."}}[5m]))'
            f' / sum(rate(http_server_request_duration_seconds_count'
            f'{{service_name="{service}"}}[5m]))'
        )
        # Execute against Prometheus and return average over window
        return self._avg_over_range(prometheus_url, query, start, end)

    def _query_p99_latency(self, prometheus_url, service, start, end):
        query = (
            "histogram_quantile(0.99, "
            f"sum by (le) (rate(http_server_request_duration_seconds_bucket"
            f'{{service_name="{service}"}}[5m])))'
        )
        return self._avg_over_range(prometheus_url, query, start, end)

    def _avg_over_range(self, prometheus_url, query, start, end):
        response = requests.get(
            f"{prometheus_url.rstrip('/')}/api/v1/query_range",
            params={
                "query": query,
                "start": start.timestamp(),
                "end": end.timestamp(),
                "step": "60s",
            },
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()["data"]["result"]
        values = [
            float(value)
            for series in result
            for _, value in series["values"]
            if value not in ("NaN", "+Inf", "-Inf")
        ]
        return sum(values) / len(values) if values else 0

    def _rollback_detected(self, service, start, end):
        # Replace with your deployment system or incident-management integration.
        return False
```

## Collector Configuration

Route deployment and application metrics through the same pipeline so they share consistent timestamps and resource attributes.

```yaml
# otel-collector-dora.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Enrich all telemetry with DORA tracking context
  resource:
    attributes:
      - key: dora.tracking
        value: "enabled"
        action: upsert

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  prometheusremotewrite:
    endpoint: "http://prometheus:9090/api/v1/write"
    resource_to_telemetry_conversion:
      enabled: true
  otlp/dora-evaluator:
    endpoint: "dora-evaluator-service:4317"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [prometheusremotewrite, otlp/dora-evaluator]
```

## Computing and Visualizing CFR

With deployment and failure data flowing through OpenTelemetry, compute the Change Failure Rate with a simple query.

```promql
# Change Failure Rate over the last 30 days
sum(increase(dora_deployments_failed_total[30d]))
/
sum(increase(dora_deployments_total[30d]))

# CFR by service - identify which services are most risky
sum by (service_name) (increase(dora_deployments_failed_total[30d]))
/
sum by (service_name) (increase(dora_deployments_total[30d]))

# CFR trend - weekly rolling window
sum(increase(dora_deployments_failed_total[7d]))
/
sum(increase(dora_deployments_total[7d]))
```

## DORA Performance Benchmarks

DORA research and assessment tools classify teams by overall software delivery performance. Treat CFR benchmarks as contextual rather than universal cutoffs:

```mermaid
graph TD
    A[Change Failure Rate Benchmarks] --> B[Elite: 0-15% in some DORA reports]
    A --> C[High: Context-dependent]
    A --> D[Medium: Context-dependent]
    A --> E[Low: Higher failure rates]

    B --> B1[Excellent testing and deployment practices]
    C --> C1[Good practices with room for improvement]
    D --> D1[Average - most teams start here]
    E --> E1[Significant process improvements needed]
```

## Breaking Down CFR for Actionable Insights

The top-level CFR number is useful for benchmarking, but it does not tell you what to fix. Break it down by failure reason to identify where investments will have the most impact.

```promql
# Failure breakdown by reason
sum by (failure_reason) (increase(dora_deployments_failed_total[30d]))
```

Common patterns you will discover:

- If most failures are "error_rate_increase", invest in better integration testing and canary deployments.
- If most failures are "rollback", your deployment pipeline may lack adequate pre-deploy validation.
- If most failures are "latency_degradation", focus on performance testing in CI.

The goal is not to reach zero CFR. Some failure rate is expected in any organization that deploys frequently. The goal is to understand your current rate, track it over time, and systematically reduce it through targeted improvements. OpenTelemetry provides the automated, reliable measurement that makes this possible.
