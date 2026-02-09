# How to Build a Security Anomaly Detection Pipeline Using OpenTelemetry Metrics and Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Security, Anomaly Detection, Observability Pipeline

Description: Build a security anomaly detection pipeline using OpenTelemetry metrics and traces to identify suspicious behavior patterns automatically.

Security anomaly detection traditionally requires specialized tools with their own data collection agents. But if you are already using OpenTelemetry for observability, you have a rich data stream that can power anomaly detection. Request patterns, error rates, latency spikes, and user behavior signals are all available in your telemetry data.

## Architecture of the Detection Pipeline

The pipeline has four stages:

1. **Collect** - Application emits metrics and traces via OpenTelemetry
2. **Aggregate** - Collector processes and computes baseline statistics
3. **Detect** - Anomaly detector compares current behavior to baselines
4. **Alert** - Deviations trigger security alerts

## Collecting Security-Relevant Metrics

First, instrument your application to emit the signals that matter for security:

```python
# security_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("security.anomaly")

# Request patterns
request_counter = meter.create_counter(
    "security.requests",
    description="Requests with security context",
    unit="1",
)

unique_endpoints_per_ip = meter.create_histogram(
    "security.unique_endpoints_per_ip",
    description="Number of unique endpoints accessed per IP in a window",
    unit="1",
)

error_rate_per_user = meter.create_histogram(
    "security.error_rate_per_user",
    description="Error rate per user session",
    unit="%",
)

# Data access patterns
data_access_counter = meter.create_counter(
    "security.data_access",
    description="Data access events with resource and user context",
    unit="1",
)

# Payload size anomalies
request_payload_size = meter.create_histogram(
    "security.request_payload_size",
    description="Size of incoming request payloads",
    unit="bytes",
)

response_payload_size = meter.create_histogram(
    "security.response_payload_size",
    description="Size of outgoing response payloads",
    unit="bytes",
)
```

## Application-Level Signal Collection

```python
# signal_collector.py
from opentelemetry import trace

tracer = trace.get_tracer("security.signals")

class SecuritySignalCollector:
    """Collects security-relevant signals from application behavior."""

    def record_request(self, request):
        """Record security signals from every request."""
        with tracer.start_as_current_span(
            "security.signal.request",
            attributes={
                "security.source_ip": request.client.host,
                "security.user_id": getattr(request.state, "user_id", "anonymous"),
                "security.endpoint": request.url.path,
                "security.method": request.method,
                "security.user_agent": request.headers.get("user-agent", ""),
            }
        ) as span:
            request_counter.add(1, {
                "security.endpoint": request.url.path,
                "security.method": request.method,
                "security.source_ip": request.client.host,
            })

            # Track payload sizes
            content_length = int(request.headers.get("content-length", 0))
            request_payload_size.record(content_length, {
                "security.endpoint": request.url.path,
            })

            # Record data access for sensitive endpoints
            if self._is_sensitive_endpoint(request.url.path):
                data_access_counter.add(1, {
                    "security.user_id": getattr(request.state, "user_id", "anonymous"),
                    "security.resource": request.url.path,
                    "security.action": request.method,
                })

    def _is_sensitive_endpoint(self, path: str) -> bool:
        sensitive_patterns = ["/api/users", "/api/billing", "/api/admin", "/api/export"]
        return any(path.startswith(p) for p in sensitive_patterns)
```

## Baseline Computation

The anomaly detector needs to know what "normal" looks like. Compute baselines from historical metrics:

```python
# baseline_computer.py
import numpy as np
from dataclasses import dataclass

@dataclass
class Baseline:
    mean: float
    std_dev: float
    p95: float
    p99: float

class BaselineComputer:
    """Computes and maintains baselines for security metrics."""

    def __init__(self, window_hours: int = 168):  # 1 week default
        self.window_hours = window_hours
        self.baselines = {}

    def compute_baseline(self, metric_name: str, historical_values: list) -> Baseline:
        """Compute statistical baseline from historical data."""
        values = np.array(historical_values)
        baseline = Baseline(
            mean=float(np.mean(values)),
            std_dev=float(np.std(values)),
            p95=float(np.percentile(values, 95)),
            p99=float(np.percentile(values, 99)),
        )
        self.baselines[metric_name] = baseline
        return baseline

    def is_anomalous(self, metric_name: str, current_value: float,
                     sigma_threshold: float = 3.0) -> bool:
        """Check if a current value is anomalous relative to baseline."""
        baseline = self.baselines.get(metric_name)
        if not baseline or baseline.std_dev == 0:
            return False

        z_score = abs(current_value - baseline.mean) / baseline.std_dev
        return z_score > sigma_threshold
```

## Anomaly Detection Engine

```python
# anomaly_detector.py
from opentelemetry import trace

tracer = trace.get_tracer("security.anomaly_detector")

class AnomalyDetector:
    def __init__(self, baseline_computer: BaselineComputer):
        self.baselines = baseline_computer

    async def analyze_window(self, window_metrics: dict):
        """Analyze a time window of metrics for anomalies."""
        with tracer.start_as_current_span("security.anomaly.analyze") as span:
            anomalies = []

            # Check request rate per IP
            for ip, count in window_metrics.get("requests_per_ip", {}).items():
                if self.baselines.is_anomalous("requests_per_ip", count):
                    anomalies.append({
                        "type": "high_request_rate",
                        "source_ip": ip,
                        "value": count,
                        "severity": "high" if count > self.baselines.baselines["requests_per_ip"].p99 else "medium",
                    })

            # Check error rates per user
            for user_id, error_pct in window_metrics.get("error_rate_per_user", {}).items():
                if self.baselines.is_anomalous("error_rate_per_user", error_pct):
                    anomalies.append({
                        "type": "abnormal_error_rate",
                        "user_id": user_id,
                        "value": error_pct,
                        "severity": "medium",
                    })

            # Check data exfiltration signals (large response payloads)
            for endpoint, avg_size in window_metrics.get("avg_response_size", {}).items():
                if self.baselines.is_anomalous(f"response_size.{endpoint}", avg_size, sigma_threshold=4.0):
                    anomalies.append({
                        "type": "large_response_anomaly",
                        "endpoint": endpoint,
                        "value": avg_size,
                        "severity": "high",
                    })

            span.set_attribute("security.anomalies_detected", len(anomalies))

            for anomaly in anomalies:
                span.add_event("security_anomaly", anomaly)
                await self._emit_alert(anomaly)

            return anomalies

    async def _emit_alert(self, anomaly: dict):
        """Send an alert for the detected anomaly."""
        with tracer.start_as_current_span(
            "security.anomaly.alert",
            attributes={
                "security.anomaly.type": anomaly["type"],
                "security.anomaly.severity": anomaly["severity"],
            }
        ):
            await send_security_alert(anomaly)
```

## Running the Pipeline

Schedule the anomaly detection to run at regular intervals, processing metrics from the observability backend:

```python
# pipeline_runner.py
async def run_detection_cycle():
    """Run one cycle of anomaly detection."""
    # Fetch last 5 minutes of aggregated metrics
    window_metrics = await fetch_metrics_window(minutes=5)

    detector = AnomalyDetector(baseline_computer)
    anomalies = await detector.analyze_window(window_metrics)

    if anomalies:
        logging.warning(f"Detected {len(anomalies)} security anomalies")
```

The power of this approach is that your anomaly detection uses the same data pipeline as your operational monitoring. No extra agents, no separate data collection. Every improvement you make to your OpenTelemetry instrumentation automatically enriches your security detection capabilities.
