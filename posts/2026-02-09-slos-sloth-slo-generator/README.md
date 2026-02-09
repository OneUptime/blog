# How to Define and Configure SLOs for Kubernetes Services Using Sloth SLO Generator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, SLO, Monitoring

Description: Learn how to define, configure, and manage Service Level Objectives for Kubernetes applications using Sloth SLO generator with practical examples and best practices.

---

Service Level Objectives define reliability targets for your services. Without SLOs, you can't measure if your service meets user expectations or if you're over-engineering reliability. Sloth automates SLO configuration and alert generation, making SLO implementation practical for Kubernetes services.

## Understanding SLOs and SLIs

Service Level Indicators are quantitative measurements of service behavior. Common SLIs include request success rate, request latency, and availability. Service Level Objectives are targets for SLIs over a time window, such as 99.9% of requests succeed in the last 30 days.

Error budgets represent acceptable failure. If your SLO is 99.9% success rate, your error budget is 0.1%. When error budget depletes, you stop shipping features and focus on reliability.

## Installing Sloth

Sloth generates Prometheus recording rules and alerts from SLO specifications.

```bash
# Install Sloth CLI
go install github.com/slok/sloth/cmd/sloth@latest

# Or download binary
wget https://github.com/slok/sloth/releases/latest/download/sloth-linux-amd64
chmod +x sloth-linux-amd64
sudo mv sloth-linux-amd64 /usr/local/bin/sloth

# Verify installation
sloth version
```

Install Sloth Kubernetes operator for automated SLO management.

```bash
# Install with Helm
helm repo add sloth https://slok.github.io/sloth
helm install sloth-controller sloth/sloth --namespace monitoring
```

## Defining Your First SLO

Create an SLO specification for an HTTP service measuring availability.

```yaml
apiVersion: sloth.slok.dev/v1
kind: PrometheusServiceLevel
metadata:
  name: api-availability
  namespace: monitoring
spec:
  service: "api-service"
  labels:
    team: platform
    tier: critical
  slos:
    - name: "requests-availability"
      objective: 99.9
      description: "99.9% of requests succeed"
      sli:
        events:
          errorQuery: |
            sum(rate(http_requests_total{service="api",code=~"5.."}[{{.window}}]))
          totalQuery: |
            sum(rate(http_requests_total{service="api"}[{{.window}}]))
      alerting:
        name: "APIHighErrorRate"
        labels:
          severity: "critical"
        annotations:
          summary: "API error budget is exhausting"
        pageAlert:
          labels:
            severity: page
        ticketAlert:
          labels:
            severity: ticket
```

Sloth generates recording rules and multi-window multi-burn-rate alerts from this specification.

## Availability SLO Example

Measure the percentage of successful requests over time.

```yaml
apiVersion: sloth.slok.dev/v1
kind: PrometheusServiceLevel
metadata:
  name: frontend-availability
  namespace: monitoring
spec:
  service: "frontend"
  labels:
    team: web
  slos:
    - name: "http-availability"
      objective: 99.95
      description: "Frontend serves 99.95% of requests successfully"
      sli:
        events:
          errorQuery: |
            sum(rate(http_server_requests_seconds_count{
              service="frontend",
              status=~"5..",
              path!~"/health.*"
            }[{{.window}}]))
          totalQuery: |
            sum(rate(http_server_requests_seconds_count{
              service="frontend",
              path!~"/health.*"
            }[{{.window}}]))
      alerting:
        name: "FrontendHighErrorRate"
        labels:
          severity: "critical"
          team: "web"
        annotations:
          summary: "Frontend error budget at risk"
          dashboard: "https://grafana.example.com/d/frontend"
```

This excludes health check endpoints from SLO calculation, focusing on user-facing traffic.

## Latency SLO Example

Define latency objectives using histogram metrics.

```yaml
apiVersion: sloth.slok.dev/v1
kind: PrometheusServiceLevel
metadata:
  name: api-latency
  namespace: monitoring
spec:
  service: "api-service"
  labels:
    team: backend
  slos:
    - name: "http-latency-p99"
      objective: 99.0
      description: "99% of requests complete within 500ms"
      sli:
        events:
          errorQuery: |
            sum(rate(http_server_requests_seconds_bucket{
              service="api",
              le="0.5"
            }[{{.window}}]))
          totalQuery: |
            sum(rate(http_server_requests_seconds_count{
              service="api"
            }[{{.window}}]))
      alerting:
        name: "APISlowRequests"
        labels:
          severity: "warning"
        annotations:
          summary: "API requests exceeding latency target"
```

This measures the percentage of requests completing within 500ms.

## Multi-SLI Services

Services often have multiple SLIs: availability, latency, and throughput.

```yaml
apiVersion: sloth.slok.dev/v1
kind: PrometheusServiceLevel
metadata:
  name: payment-service-slos
  namespace: monitoring
spec:
  service: "payment-service"
  labels:
    team: payments
    criticality: high
  slos:
    # Availability SLO
    - name: "requests-availability"
      objective: 99.99
      description: "Payment requests succeed 99.99% of the time"
      sli:
        events:
          errorQuery: |
            sum(rate(payment_requests_total{
              result="error"
            }[{{.window}}]))
          totalQuery: |
            sum(rate(payment_requests_total[{{.window}}]))
      alerting:
        name: "PaymentServiceHighErrorRate"
        labels:
          severity: "page"
    # Latency SLO
    - name: "requests-latency-p95"
      objective: 99.5
      description: "95th percentile latency under 1 second"
      sli:
        events:
          errorQuery: |
            sum(rate(payment_request_duration_seconds_bucket{
              le="1.0"
            }[{{.window}}]))
          totalQuery: |
            sum(rate(payment_request_duration_seconds_count[{{.window}}]))
      alerting:
        name: "PaymentServiceSlowRequests"
        labels:
          severity: "ticket"
```

Multiple SLOs provide comprehensive service health monitoring.

## Generating Prometheus Rules

Sloth generates Prometheus recording rules and alerts from SLO specs.

```bash
# Generate rules from SLO spec
sloth generate -i slo-spec.yaml -o prometheus-rules.yaml

# Apply to Kubernetes cluster
kubectl apply -f prometheus-rules.yaml

# Or let Sloth operator handle it automatically
kubectl apply -f slo-spec.yaml
```

Generated rules calculate SLI, error budget, and burn rates automatically.

## Understanding Multi-Window Multi-Burn-Rate Alerts

Sloth generates sophisticated alerts based on error budget burn rate.

Fast burn alerts fire when error budget depletes quickly, indicating severe issues. Slow burn alerts fire when error budget depletes steadily over days. This prevents alert fatigue from minor transient issues.

```yaml
# Sloth generates alerts like these automatically
groups:
- name: sloth-slo-sli-recordings-api-service-requests-availability
  interval: 30s
  rules:
  - record: slo:sli_error:ratio_rate5m
    expr: |
      sum(rate(http_requests_total{service="api",code=~"5.."}[5m]))
      /
      sum(rate(http_requests_total{service="api"}[5m]))
    labels:
      sloth_service: "api-service"
      sloth_slo: "requests-availability"

  # Multi-window alerts
  - alert: APIHighErrorRate
    expr: |
      (
        slo:sli_error:ratio_rate5m{sloth_service="api-service"} > (14.4 * 0.001)
        and
        slo:sli_error:ratio_rate1h{sloth_service="api-service"} > (14.4 * 0.001)
      )
    labels:
      severity: page
    annotations:
      summary: "High error budget burn rate"
```

## Customizing Alert Routing

Configure different alert severity for different burn rates.

```yaml
apiVersion: sloth.slok.dev/v1
kind: PrometheusServiceLevel
metadata:
  name: critical-api
spec:
  service: "critical-api"
  slos:
    - name: "availability"
      objective: 99.95
      sli:
        events:
          errorQuery: sum(rate(requests_total{status=~"5.."}[{{.window}}]))
          totalQuery: sum(rate(requests_total[{{.window}}]))
      alerting:
        name: "CriticalAPIErrors"
        labels:
          team: "platform"
        annotations:
          runbook: "https://wiki.example.com/runbook/api-errors"
        # Page for fast burn
        pageAlert:
          labels:
            severity: "critical"
            alert_type: "page"
          annotations:
            summary: "Critical API error budget burning fast"
        # Ticket for slow burn
        ticketAlert:
          labels:
            severity: "warning"
            alert_type: "ticket"
          annotations:
            summary: "Critical API error budget burning slowly"
```

Fast burns trigger pages, slow burns create tickets.

## Monitoring Error Budget

Track error budget consumption with Grafana dashboards.

```json
{
  "panels": [
    {
      "title": "Error Budget Remaining",
      "targets": [
        {
          "expr": "1 - (slo:period_error_budget_remaining:ratio{sloth_service=\"api-service\"})"
        }
      ],
      "thresholds": [
        {"value": 0.8, "color": "green"},
        {"value": 0.5, "color": "yellow"},
        {"value": 0, "color": "red"}
      ]
    },
    {
      "title": "SLI vs SLO",
      "targets": [
        {
          "expr": "slo:sli_error:ratio_rate30d{sloth_service=\"api-service\"}",
          "legendFormat": "Current SLI"
        },
        {
          "expr": "slo:objective:ratio{sloth_service=\"api-service\"}",
          "legendFormat": "SLO Target"
        }
      ]
    }
  ]
}
```

Visualize error budget consumption to make informed deployment decisions.

## Per-Endpoint SLOs

Define SLOs for critical endpoints separately.

```yaml
apiVersion: sloth.slok.dev/v1
kind: PrometheusServiceLevel
metadata:
  name: checkout-endpoint
spec:
  service: "ecommerce"
  labels:
    endpoint: "checkout"
  slos:
    - name: "checkout-availability"
      objective: 99.99  # Higher target for critical endpoint
      description: "Checkout endpoint must be highly available"
      sli:
        events:
          errorQuery: |
            sum(rate(http_requests_total{
              service="ecommerce",
              path="/api/checkout",
              code=~"5.."
            }[{{.window}}]))
          totalQuery: |
            sum(rate(http_requests_total{
              service="ecommerce",
              path="/api/checkout"
            }[{{.window}}]))
      alerting:
        name: "CheckoutEndpointErrors"
        pageAlert:
          labels:
            severity: "critical"
```

Critical endpoints warrant stricter SLOs than less important paths.

## SLO-Based Deployment Gating

Use error budget to gate deployments automatically.

```yaml
# Example: Check error budget before deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: deployment-gate
spec:
  template:
    spec:
      containers:
      - name: check-slo
        image: curlimages/curl
        command:
        - sh
        - -c
        - |
          ERROR_BUDGET=$(curl -s http://prometheus:9090/api/v1/query \
            --data-urlencode 'query=slo:period_error_budget_remaining:ratio{sloth_service="api-service"}' \
            | jq -r '.data.result[0].value[1]')

          if (( $(echo "$ERROR_BUDGET < 0.2" | bc -l) )); then
            echo "Error budget depleted, blocking deployment"
            exit 1
          fi

          echo "Error budget sufficient, proceeding with deployment"
          exit 0
      restartPolicy: Never
```

Prevent deployments when error budget is exhausted.

## Best Practices

Start with availability SLOs before adding latency objectives. Availability is easier to measure and reason about.

Set realistic objectives based on current performance. Don't set 99.99% SLO if your service currently achieves 99.5%.

Review SLOs quarterly. Adjust objectives as service evolves and requirements change.

Focus on user-impacting metrics. Internal health checks shouldn't count toward SLOs.

Document why each SLO matters. Explain the business impact of missing objectives.

Use error budgets to balance feature velocity with reliability. Depleted budgets signal focus on reliability work.

## Conclusion

Sloth simplifies SLO implementation for Kubernetes services by generating Prometheus rules and alerts automatically. Define clear SLIs, set realistic objectives, and use error budgets to make data-driven reliability decisions. Start with availability SLOs, expand to latency objectives, and customize alerting for different burn rates. With proper SLO implementation, teams balance feature development with reliability requirements while maintaining excellent user experience.
