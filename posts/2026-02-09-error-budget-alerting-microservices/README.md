# How to Implement Error Budget-Based Alerting for Kubernetes Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, SRE, Monitoring

Description: Learn how to implement error budget-based alerting for microservices in Kubernetes with practical examples for multi-window alerts and burn rate calculations.

---

Traditional threshold-based alerts create noise and miss important trends. Error budget-based alerting connects alerts to user impact and business objectives. When error budgets burn quickly, you know reliability is at risk and need to respond immediately.

## Understanding Error Budgets

An error budget is the acceptable amount of failure derived from your SLO. With a 99.9% availability SLO, you have a 0.1% error budget. Over 30 days, this equals 43 minutes of downtime or failed requests.

Error budgets provide objective criteria for release decisions. When error budget remains, ship features aggressively. When depleted, focus on reliability improvements and slow down releases.

## Calculating Burn Rates

Burn rate measures how quickly error budget depletes. A burn rate of 1 means you're consuming error budget at exactly the rate to reach zero by the end of the SLO period. A burn rate of 10 means you'll exhaust error budget in 1/10th the time.

Fast burns indicate severe ongoing issues. Slow burns show gradual degradation that compounds over time.

```yaml
# Prometheus recording rule for burn rate
groups:
- name: error-budget-burn-rate
  interval: 30s
  rules:
    # Calculate error rate
    - record: error_rate:5m
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[5m]))
        /
        sum(rate(http_requests_total[5m]))

    # Calculate burn rate (error rate / error budget)
    - record: error_budget:burn_rate:5m
      expr: |
        error_rate:5m
        /
        (1 - 0.999)  # SLO is 99.9%

    # One hour window
    - record: error_budget:burn_rate:1h
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[1h]))
        /
        sum(rate(http_requests_total[1h]))
        /
        (1 - 0.999)
```

These recording rules provide burn rates for different time windows.

## Multi-Window Multi-Burn-Rate Alerts

Google's SRE workbook recommends multi-window alerts to reduce false positives while catching real issues quickly.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  error-budget-alerts.yml: |
    groups:
    - name: error_budget_alerts
      interval: 30s
      rules:
        # Fast burn (2% error budget in 1 hour)
        - alert: ErrorBudgetFastBurn
          expr: |
            (
              error_budget:burn_rate:5m > (14.4 * 1)
              and
              error_budget:burn_rate:1h > (14.4 * 1)
            )
          for: 2m
          labels:
            severity: critical
            alert_type: page
          annotations:
            summary: "Error budget burning at 14.4x rate"
            description: "At this rate, error budget exhausts in 2 hours"
            impact: "Users experiencing service degradation"

        # Moderate burn (5% error budget in 6 hours)
        - alert: ErrorBudgetModerateBurn
          expr: |
            (
              error_budget:burn_rate:30m > (6 * 1)
              and
              error_budget:burn_rate:6h > (6 * 1)
            )
          for: 15m
          labels:
            severity: warning
            alert_type: page
          annotations:
            summary: "Error budget burning at 6x rate"
            description: "At this rate, error budget exhausts in 5 days"

        # Slow burn (10% error budget in 3 days)
        - alert: ErrorBudgetSlowBurn
          expr: |
            (
              error_budget:burn_rate:2h > (3 * 1)
              and
              error_budget:burn_rate:1d > (3 * 1)
            )
          for: 1h
          labels:
            severity: warning
            alert_type: ticket
          annotations:
            summary: "Error budget burning at 3x rate"
            description: "At this rate, error budget exhausts in 10 days"
```

Different burn rates trigger different response types: pages for fast burns, tickets for slow burns.

## Per-Service Error Budget Alerts

Implement error budget alerts for each microservice independently.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: service-error-budgets
  namespace: monitoring
data:
  service-alerts.yml: |
    groups:
    - name: api_service_error_budget
      rules:
        # API Service - 99.95% SLO
        - record: api_service:error_rate:5m
          expr: |
            sum(rate(http_requests_total{service="api",status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{service="api"}[5m]))

        - record: api_service:burn_rate:5m
          expr: api_service:error_rate:5m / (1 - 0.9995)

        - alert: APIServiceFastBurn
          expr: |
            api_service:burn_rate:5m > 14.4
            and
            api_service:burn_rate:1h > 14.4
          for: 2m
          labels:
            service: api
            severity: critical
          annotations:
            summary: "API service error budget burning fast"

    - name: payment_service_error_budget
      rules:
        # Payment Service - 99.99% SLO (stricter)
        - record: payment_service:error_rate:5m
          expr: |
            sum(rate(payment_requests_total{result="error"}[5m]))
            /
            sum(rate(payment_requests_total[5m]))

        - record: payment_service:burn_rate:5m
          expr: payment_service:error_rate:5m / (1 - 0.9999)

        - alert: PaymentServiceFastBurn
          expr: |
            payment_service:burn_rate:5m > 14.4
            and
            payment_service:burn_rate:1h > 14.4
          for: 2m
          labels:
            service: payment
            severity: critical
            page_team: payments
```

Critical services warrant stricter SLOs and faster response times.

## Error Budget Remaining Tracking

Monitor how much error budget remains over the SLO period.

```yaml
groups:
- name: error_budget_remaining
  interval: 5m
  rules:
    # Total error budget for 30-day period
    - record: error_budget:total:30d
      expr: |
        (1 - 0.999) * 30 * 24 * 60  # 0.1% of 30 days in minutes

    # Errors in last 30 days
    - record: errors:total:30d
      expr: |
        sum(increase(http_requests_total{status=~"5.."}[30d]))
        /
        sum(increase(http_requests_total[30d]))
        *
        30 * 24 * 60

    # Remaining error budget
    - record: error_budget:remaining:30d
      expr: |
        error_budget:total:30d - errors:total:30d

    # Percentage remaining
    - record: error_budget:remaining:ratio
      expr: |
        error_budget:remaining:30d / error_budget:total:30d

    # Alert when error budget nearly exhausted
    - alert: ErrorBudgetDepleted
      expr: error_budget:remaining:ratio < 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Only {{ $value | humanizePercentage }} error budget remains"
        description: "Stop non-critical releases until error budget recovers"
```

This tracks error budget consumption and alerts when nearly exhausted.

## Latency Error Budgets

Apply error budget concepts to latency SLOs.

```yaml
groups:
- name: latency_error_budget
  rules:
    # Percentage of requests exceeding latency target
    - record: latency:error_rate:5m
      expr: |
        1 - (
          sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
          /
          sum(rate(http_request_duration_seconds_count[5m]))
        )

    # Latency burn rate (target: 99% under 500ms)
    - record: latency:burn_rate:5m
      expr: latency:error_rate:5m / (1 - 0.99)

    - alert: LatencyBudgetFastBurn
      expr: |
        latency:burn_rate:5m > 14.4
        and
        latency:burn_rate:1h > 14.4
      for: 2m
      labels:
        severity: warning
        slo_type: latency
      annotations:
        summary: "Too many slow requests"
        description: "{{ $value }}x normal rate of slow requests"
```

Latency budgets ensure response times meet user expectations.

## Composite Error Budgets

Combine multiple SLIs into a composite error budget for overall service health.

```yaml
groups:
- name: composite_error_budget
  rules:
    # Availability error rate
    - record: availability:error_rate:5m
      expr: |
        sum(rate(requests_total{status=~"5.."}[5m]))
        /
        sum(rate(requests_total[5m]))

    # Latency error rate (requests > 500ms)
    - record: latency:error_rate:5m
      expr: |
        1 - (
          sum(rate(request_duration_bucket{le="0.5"}[5m]))
          /
          sum(rate(request_duration_count[5m]))
        )

    # Composite error rate (either availability or latency violation)
    - record: composite:error_rate:5m
      expr: |
        availability:error_rate:5m + latency:error_rate:5m
        -
        (availability:error_rate:5m * latency:error_rate:5m)

    # Composite burn rate
    - record: composite:burn_rate:5m
      expr: composite:error_rate:5m / (1 - 0.995)

    - alert: ServiceHealthDegraded
      expr: |
        composite:burn_rate:5m > 10
        and
        composite:burn_rate:1h > 10
      labels:
        severity: warning
```

Composite budgets provide holistic service health assessment.

## Dependency Error Budgets

Track error budgets for service dependencies.

```yaml
groups:
- name: dependency_error_budgets
  rules:
    # Database error rate
    - record: database:error_rate:5m
      expr: |
        sum(rate(database_queries_total{result="error"}[5m]))
        /
        sum(rate(database_queries_total[5m]))

    # External API error rate
    - record: external_api:error_rate:5m
      expr: |
        sum(rate(external_api_calls_total{status=~"5..|error"}[5m]))
        /
        sum(rate(external_api_calls_total[5m]))

    # Alert when dependencies consume error budget
    - alert: DependencyErrorBudgetImpact
      expr: |
        (database:error_rate:5m > 0.001)
        or
        (external_api:error_rate:5m > 0.005)
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Dependency errors affecting service error budget"
```

Dependency errors impact your service's error budget even if your code works perfectly.

## Error Budget-Based Deployment Gates

Automatically block deployments when error budget is depleted.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: check-error-budget
spec:
  template:
    spec:
      containers:
      - name: budget-check
        image: curlimages/curl:latest
        command:
        - sh
        - -c
        - |
          BUDGET=$(curl -s http://prometheus:9090/api/v1/query \
            --data-urlencode 'query=error_budget:remaining:ratio' \
            | jq -r '.data.result[0].value[1]')

          echo "Error budget remaining: ${BUDGET}"

          # Block deployment if less than 20% budget remains
          if [ $(echo "$BUDGET < 0.2" | bc) -eq 1 ]; then
            echo "ERROR: Insufficient error budget for deployment"
            echo "Remaining: ${BUDGET}, Required: 0.2"
            exit 1
          fi

          echo "Deployment approved - sufficient error budget"
          exit 0
      restartPolicy: Never
  backoffLimit: 0
```

Integration with CI/CD prevents risky deployments when reliability is already compromised.

## Visualizing Error Budgets

Create Grafana dashboards for error budget visibility.

```json
{
  "panels": [
    {
      "title": "Error Budget Burn Rate",
      "targets": [
        {
          "expr": "error_budget:burn_rate:5m",
          "legendFormat": "5m window"
        },
        {
          "expr": "error_budget:burn_rate:1h",
          "legendFormat": "1h window"
        },
        {
          "expr": "error_budget:burn_rate:1d",
          "legendFormat": "1d window"
        }
      ],
      "thresholds": [
        {"value": 1, "color": "green"},
        {"value": 3, "color": "yellow"},
        {"value": 10, "color": "red"}
      ]
    },
    {
      "title": "Error Budget Remaining (30d)",
      "targets": [
        {
          "expr": "error_budget:remaining:ratio * 100",
          "legendFormat": "Budget Remaining %"
        }
      ],
      "gauge": {
        "minValue": 0,
        "maxValue": 100,
        "thresholds": [
          {"value": 0, "color": "red"},
          {"value": 20, "color": "yellow"},
          {"value": 50, "color": "green"}
        ]
      }
    }
  ]
}
```

Visual dashboards help teams understand error budget status at a glance.

## Best Practices

Set burn rate thresholds based on acceptable time to recovery. Fast burns should alert immediately, slow burns can wait hours.

Use multi-window alerts to reduce false positives. Single-window alerts fire on transient spikes.

Differentiate alert severity by burn rate. Page for fast burns, create tickets for slow burns.

Review error budget policy monthly. Adjust SLOs and alerting thresholds as service evolves.

Document what teams should do when alerts fire. Include troubleshooting steps and escalation procedures.

Track error budget over multiple SLO periods. Historical trends inform capacity planning and architecture decisions.

## Conclusion

Error budget-based alerting connects monitoring to business objectives and user impact. Calculate burn rates across multiple time windows to catch both severe outages and gradual degradation. Alert on burn rates rather than absolute thresholds to reduce noise while maintaining responsiveness. Use error budgets to make data-driven deployment decisions and balance feature velocity with reliability. With proper error budget alerting, teams respond to real issues while ignoring transient noise.
