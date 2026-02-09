# How to Build Automated Incident Severity Classification from OpenTelemetry Signal Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Incident Classification, Severity, Automation

Description: Automatically classify incident severity using signal patterns from OpenTelemetry traces, logs, and metrics instead of manual triage.

When an alert fires, someone has to decide whether it is a P1 (all hands on deck) or a P4 (look at it Monday). This classification step is critical because it determines the response speed, who gets paged, and what communication channels activate. Most teams rely on the on-call engineer to make this judgment call at 3 AM, which leads to inconsistent classification and delayed escalation. OpenTelemetry signal data contains enough information to automate this decision reliably.

## The Signal-Based Severity Model

Instead of relying on human judgment under pressure, define severity levels based on measurable signal thresholds. Here is a practical severity model built on OpenTelemetry metrics.

```python
# Severity classification rules based on OTel signal patterns
SEVERITY_RULES = {
    "P1": {
        "description": "Critical - customer-facing outage",
        "conditions": {
            "any_of": [
                # Complete service unavailability
                {"metric": "http.server.request.count", "condition": "rate_drop > 95%"},
                # Error rate above 50% for customer-facing services
                {"metric": "http.server.error_rate", "condition": "> 0.50",
                 "filter": {"service.tier": "customer-facing"}},
                # Multiple services affected simultaneously
                {"metric": "affected_services_count", "condition": ">= 3"},
            ]
        },
        "response": {"page": "all-oncall", "channel": "#incident-war-room"}
    },
    "P2": {
        "description": "High - significant degradation",
        "conditions": {
            "any_of": [
                # Error rate between 10-50% for customer-facing services
                {"metric": "http.server.error_rate", "condition": "0.10 to 0.50",
                 "filter": {"service.tier": "customer-facing"}},
                # Latency p99 more than 5x normal
                {"metric": "http.server.duration_p99", "condition": "> 5x baseline"},
                # Single critical service degraded
                {"metric": "affected_services_count", "condition": "1-2",
                 "filter": {"service.tier": "critical"}},
            ]
        },
        "response": {"page": "primary-oncall", "channel": "#incidents"}
    },
    "P3": {
        "description": "Medium - minor degradation",
        "conditions": {
            "any_of": [
                {"metric": "http.server.error_rate", "condition": "0.01 to 0.10"},
                {"metric": "http.server.duration_p99", "condition": "2x to 5x baseline"},
            ]
        },
        "response": {"page": "none", "channel": "#alerts"}
    },
    "P4": {
        "description": "Low - cosmetic or non-urgent",
        "conditions": {
            "any_of": [
                {"metric": "http.server.error_rate", "condition": "< 0.01"},
                # Only non-customer-facing services affected
                {"metric": "affected_services_count", "condition": ">= 1",
                 "filter": {"service.tier": "internal"}},
            ]
        },
        "response": {"page": "none", "channel": "#alerts-low"}
    }
}
```

## The Classification Engine

This engine receives OpenTelemetry metrics from the Collector and evaluates them against the severity rules in real time.

```python
# Automated severity classification engine
from opentelemetry import metrics
from datetime import datetime, timedelta
import requests

meter = metrics.get_meter("incident.classifier")

classification_counter = meter.create_counter(
    "incident.classification.total",
    description="Number of incidents classified by severity",
    unit="1"
)

class SeverityClassifier:
    def __init__(self, prometheus_url, service_catalog):
        self.prometheus_url = prometheus_url
        self.service_catalog = service_catalog  # Maps service -> tier

    def classify(self, alert):
        """
        Given an alert, gather OTel metric signals and determine severity.
        Returns severity level (P1-P4) and the signals that determined it.
        """
        signals = self._gather_signals(alert)
        severity, matched_rules = self._evaluate_rules(signals)

        # Record the classification for tracking
        classification_counter.add(1, attributes={
            "severity": severity,
            "service.name": alert.service,
            "classification.method": "automated",
        })

        return {
            "severity": severity,
            "signals": signals,
            "matched_rules": matched_rules,
            "classified_at": datetime.utcnow().isoformat(),
        }

    def _gather_signals(self, alert):
        """Collect current signal values from OTel metrics."""
        service = alert.service
        signals = {}

        # Current error rate
        error_rate = self._query_metric(
            f'sum(rate(http_server_request_count_total{{service_name="{service}",'
            f'status_code=~"5.."}}[5m])) / '
            f'sum(rate(http_server_request_count_total{{service_name="{service}"}}[5m]))'
        )
        signals["error_rate"] = error_rate

        # Latency p99 compared to baseline
        current_p99 = self._query_metric(
            f'histogram_quantile(0.99, rate(http_server_duration_bucket'
            f'{{service_name="{service}"}}[5m]))'
        )
        baseline_p99 = self._query_metric(
            f'histogram_quantile(0.99, rate(http_server_duration_bucket'
            f'{{service_name="{service}"}}[5m] offset 1d))'
        )
        signals["latency_multiplier"] = (
            current_p99 / baseline_p99 if baseline_p99 > 0 else 1.0
        )

        # Count of affected services (services with elevated error rates)
        affected = self._query_metric(
            'count(sum by (service_name) '
            '(rate(http_server_request_count_total{status_code=~"5.."}[5m])) > 0.05)'
        )
        signals["affected_services_count"] = int(affected)

        # Service tier from catalog
        signals["service_tier"] = self.service_catalog.get(service, "internal")

        # Request rate drop (potential outage indicator)
        current_rate = self._query_metric(
            f'sum(rate(http_server_request_count_total{{service_name="{service}"}}[5m]))'
        )
        baseline_rate = self._query_metric(
            f'sum(rate(http_server_request_count_total{{service_name="{service}"}}[5m] offset 1h))'
        )
        signals["request_rate_drop_pct"] = (
            max(0, (1 - current_rate / baseline_rate) * 100)
            if baseline_rate > 0 else 0
        )

        return signals

    def _evaluate_rules(self, signals):
        """Match signals against severity rules, highest severity first."""
        for severity in ["P1", "P2", "P3", "P4"]:
            rules = SEVERITY_RULES[severity]
            matched = []

            for condition in rules["conditions"]["any_of"]:
                if self._check_condition(condition, signals):
                    matched.append(condition)

            if matched:
                return severity, matched

        return "P4", []  # Default to lowest severity
```

## Collector Pipeline for Classification

The Collector forwards metrics to both storage and the classification service.

```yaml
# otel-collector-classification.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    send_batch_size: 256
    timeout: 2s

  # Add service tier information from resource attributes
  resource:
    attributes:
      - key: service.tier
        from_attribute: service.namespace
        action: upsert

exporters:
  otlp/backend:
    endpoint: "metrics-backend:4317"
  otlp/classifier:
    endpoint: "severity-classifier:4317"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/backend, otlp/classifier]
```

## Handling Severity Changes During an Incident

Incidents evolve. What starts as a P3 can escalate to a P1 as the blast radius grows. The classifier should continuously re-evaluate.

```python
# Continuous severity re-evaluation during active incidents
class IncidentSeverityWatcher:
    def __init__(self, classifier, check_interval_seconds=60):
        self.classifier = classifier
        self.check_interval = check_interval_seconds
        self.active_incidents = {}

    def watch(self, incident):
        """Re-evaluate severity every check_interval and escalate if needed."""
        current = incident.severity
        new_classification = self.classifier.classify(incident.alert)
        new_severity = new_classification["severity"]

        # Only escalate, never auto-downgrade
        if self._is_higher_severity(new_severity, current):
            incident.escalate(
                new_severity=new_severity,
                reason=f"Auto-escalated based on signals: {new_classification['signals']}",
                matched_rules=new_classification["matched_rules"]
            )

    def _is_higher_severity(self, new, current):
        order = {"P1": 1, "P2": 2, "P3": 3, "P4": 4}
        return order.get(new, 4) < order.get(current, 4)
```

## Validating Classification Accuracy

Track how often the automated classification matches the final severity assigned by the incident commander. This feedback loop improves the rules over time.

```promql
# Classification accuracy rate
sum(incident_classification_total{final_severity_matches="true"})
/
sum(incident_classification_total)

# Over-classification rate (automated severity higher than actual)
sum(incident_classification_total{classification_error="over_classified"})
/
sum(incident_classification_total)
```

The goal of automated severity classification is not to remove human judgment from incident response. It is to provide a fast, consistent starting point so that the on-call engineer does not waste the first five minutes of an incident deciding who to page. As your rules mature and accuracy improves, you build organizational trust in the system, which leads to faster and more consistent incident response.
