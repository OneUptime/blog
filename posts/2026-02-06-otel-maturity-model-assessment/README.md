# How to Create an OpenTelemetry Maturity Model Assessment for Your Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Maturity Model, Observability, Assessment

Description: Create a practical OpenTelemetry maturity model that helps your organization assess its current observability state and plan a clear path forward.

Adopting OpenTelemetry is not a binary event. It is a journey with distinct stages. Some teams will be generating basic traces while others have not started yet. A maturity model gives everyone a common language for describing where they are and a roadmap for where to go next.

## The Five Levels

Define five maturity levels that map to real capabilities:

**Level 0 - No Instrumentation**: The service has no OpenTelemetry integration. Debugging relies on application logs and guesswork.

**Level 1 - Basic Auto-Instrumentation**: The service has the OpenTelemetry SDK installed with auto-instrumentation for HTTP, database, and RPC frameworks. Traces appear in the backend but have no custom business context.

**Level 2 - Enriched Instrumentation**: The service adds custom spans for business logic, includes domain-specific attributes, and follows naming conventions. Metrics cover basic request rates and error rates.

**Level 3 - Comprehensive Observability**: The service has complete trace coverage, custom metrics for business KPIs, log-trace correlation, and alarms based on telemetry data. Dashboards exist for both operational and business monitoring.

**Level 4 - Advanced Practices**: The service uses exemplars to link metrics to traces, implements custom sampling strategies, contributes to shared conventions, and uses telemetry data for capacity planning and SLO tracking.

## Assessment Criteria

For each level, define specific, measurable criteria. Here is a scoring rubric:

```yaml
# maturity-assessment.yaml
levels:
  level_0:
    name: "No Instrumentation"
    criteria:
      - "No OpenTelemetry SDK installed"
      - "No traces or metrics exported"
    score: 0

  level_1:
    name: "Basic Auto-Instrumentation"
    criteria:
      - "OpenTelemetry SDK installed and initialized"
      - "Auto-instrumentation enabled for HTTP server"
      - "Traces visible in the observability backend"
      - "Resource attributes include service.name and deployment.environment"
    score: 1

  level_2:
    name: "Enriched Instrumentation"
    criteria:
      - "All Level 1 criteria met"
      - "Custom spans for key business operations"
      - "Domain-specific attributes on spans (e.g., order.id, user.id)"
      - "Span naming follows organizational conventions"
      - "Basic request rate and error rate metrics exported"
      - "Resource attributes include service.team and service.namespace"
    score: 2

  level_3:
    name: "Comprehensive Observability"
    criteria:
      - "All Level 2 criteria met"
      - "Log-trace correlation configured"
      - "Custom business metrics (e.g., orders per minute, revenue per hour)"
      - "Alerts defined based on OpenTelemetry metrics"
      - "Operational dashboard exists for the service"
      - "Error spans include exception details and stack traces"
      - "Context propagation works across all downstream calls"
    score: 3

  level_4:
    name: "Advanced Practices"
    criteria:
      - "All Level 3 criteria met"
      - "Exemplars link metrics to representative traces"
      - "Custom sampling rules reduce noise while preserving signal"
      - "SLOs defined and tracked using OpenTelemetry metrics"
      - "Telemetry data used for capacity planning"
      - "Team contributes to shared semantic conventions"
      - "Runbooks reference specific trace queries and metric dashboards"
    score: 4
```

## Building the Assessment Tool

Create a simple script that teams can run to self-assess their services:

```python
#!/usr/bin/env python3
"""
OpenTelemetry Maturity Assessment Tool
Run this against a service to check its instrumentation maturity level.
"""

import requests
import sys

def check_traces_exist(service_name: str, backend_url: str) -> bool:
    """Check if the service has traces in the last hour."""
    response = requests.get(
        f"{backend_url}/api/traces",
        params={"service": service_name, "limit": 1, "lookback": "1h"}
    )
    data = response.json()
    return len(data.get("data", [])) > 0

def check_custom_spans(service_name: str, backend_url: str) -> bool:
    """Check if the service has spans beyond auto-instrumentation."""
    response = requests.get(
        f"{backend_url}/api/traces",
        params={"service": service_name, "limit": 10, "lookback": "1h"}
    )
    data = response.json()
    for trace in data.get("data", []):
        for span in trace.get("spans", []):
            op = span.get("operationName", "")
            # Auto-instrumented spans usually start with HTTP or have DB prefixes
            # Custom spans follow our <domain>.<operation> convention
            if "." in op and not op.startswith("HTTP"):
                return True
    return False

def check_resource_attributes(service_name: str, backend_url: str) -> dict:
    """Check which resource attributes are present."""
    response = requests.get(
        f"{backend_url}/api/traces",
        params={"service": service_name, "limit": 1, "lookback": "1h"}
    )
    data = response.json()
    if not data.get("data"):
        return {}

    # Extract resource attributes from the first trace
    process = data["data"][0]["processes"]
    first_process = list(process.values())[0]
    tags = {t["key"]: t["value"] for t in first_process.get("tags", [])}
    return tags

def assess(service_name: str, backend_url: str):
    """Run the full assessment."""
    print(f"Assessing: {service_name}")
    print("-" * 40)

    # Level 1 checks
    has_traces = check_traces_exist(service_name, backend_url)
    print(f"  Traces exist: {'PASS' if has_traces else 'FAIL'}")

    resource_attrs = check_resource_attributes(service_name, backend_url)
    has_service_name = "service.name" in resource_attrs
    has_environment = "deployment.environment" in resource_attrs
    print(f"  service.name set: {'PASS' if has_service_name else 'FAIL'}")
    print(f"  deployment.environment set: {'PASS' if has_environment else 'FAIL'}")

    # Level 2 checks
    has_custom = check_custom_spans(service_name, backend_url)
    has_team = "service.team" in resource_attrs
    print(f"  Custom spans: {'PASS' if has_custom else 'FAIL'}")
    print(f"  service.team set: {'PASS' if has_team else 'FAIL'}")

    # Determine level
    if not has_traces:
        level = 0
    elif not has_custom:
        level = 1
    elif not has_team:
        level = 1
    else:
        level = 2  # Further checks needed for levels 3-4

    print(f"\nAssessed maturity level: {level}")
    return level

if __name__ == "__main__":
    service = sys.argv[1] if len(sys.argv) > 1 else "order-service"
    backend = sys.argv[2] if len(sys.argv) > 2 else "http://jaeger.internal:16686"
    assess(service, backend)
```

## Tracking Progress

Create a dashboard or spreadsheet that tracks every service's maturity level over time:

| Service | Team | Current Level | Target Level | Target Date |
|---------|------|--------------|-------------|-------------|
| order-service | checkout | Level 3 | Level 4 | Q2 2026 |
| payment-service | payments | Level 2 | Level 3 | Q1 2026 |
| user-service | identity | Level 1 | Level 2 | Q1 2026 |
| notification-service | messaging | Level 0 | Level 1 | Q1 2026 |

Review this quarterly. Celebrate teams that level up. Offer support to teams that are stuck.

## Using the Model Effectively

The maturity model is a coaching tool, not a compliance weapon. Here is how to use it well:

- Let teams self-assess first. They know their services better than anyone.
- Set achievable targets. Moving from Level 0 to Level 1 in a sprint is realistic. Moving from Level 0 to Level 3 is not.
- Tie maturity levels to concrete benefits. Level 2 means you can debug production issues without reproducing them locally. Level 3 means you can set up meaningful alerts.
- Do not require every service to reach Level 4. Internal tools and low-traffic services may be fine at Level 1 or Level 2.

The maturity model works best when it aligns with your organization's goals. If reliability is a priority, emphasize the levels that improve incident response. If cost efficiency matters, emphasize the levels that enable data-driven optimization.

Assess where you are, decide where you need to be, and build a plan to get there. The model provides the framework; your teams provide the momentum.
