# How to Monitor Istio SLOs with OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, SLOs, SLIs, Reliability

Description: Define and monitor Service Level Objectives for Istio-managed services using OneUptime with practical examples and error budget tracking.

---

Service Level Objectives give you a framework for answering the question "is this service reliable enough?" Instead of chasing every blip in your metrics, you define what "good enough" means and track your actual performance against that target. Istio generates exactly the metrics you need to build solid SLOs, and OneUptime gives you the tools to track them.

## SLO Fundamentals

Quick refresher on the terminology:

- **SLI (Service Level Indicator)**: A metric that measures some aspect of service quality. Example: "the percentage of requests that return a 2xx status code."
- **SLO (Service Level Objective)**: A target for your SLI. Example: "99.9% of requests should return a 2xx status code over a 30-day window."
- **Error Budget**: The inverse of your SLO. If your SLO is 99.9%, your error budget is 0.1%, which means you can tolerate 43.2 minutes of downtime per month.

## Choosing Your SLIs

Istio gives you the building blocks for the most common SLI types.

### Availability SLI

The most fundamental SLI measures whether requests succeed:

```
# Availability = successful requests / total requests
# Using Istio metrics:

availability = sum(rate(istio_requests_total{
  response_code!~"5.*",
  destination_service="my-service.default.svc.cluster.local"
}[30d]))
/
sum(rate(istio_requests_total{
  destination_service="my-service.default.svc.cluster.local"
}[30d]))
```

Be careful about what counts as "successful." A 404 might be a valid response (the resource doesn't exist) or it might indicate a broken route. Define your success criteria clearly.

### Latency SLI

Measures whether requests complete fast enough:

```
# Latency SLI = requests faster than threshold / total requests
# "99% of requests should complete in under 500ms"

latency_sli = sum(rate(istio_request_duration_milliseconds_bucket{
  le="500",
  destination_service="my-service.default.svc.cluster.local"
}[30d]))
/
sum(rate(istio_request_duration_milliseconds_count{
  destination_service="my-service.default.svc.cluster.local"
}[30d]))
```

### Throughput SLI

Measures whether the service handles expected load:

```
# Throughput = actual request rate vs expected minimum
# Less common but useful for services with SLAs

throughput_sli = sum(rate(istio_requests_total{
  destination_service="my-service.default.svc.cluster.local"
}[5m]))
```

## Defining Your SLOs

Start with your most critical services and define SLOs that match your actual business requirements. Here's a practical set:

| Service | SLI Type | SLO Target | Window |
|---|---|---|---|
| API Gateway | Availability | 99.95% | 30 days |
| API Gateway | Latency (p99) | < 200ms for 99% of requests | 30 days |
| Payment Service | Availability | 99.99% | 30 days |
| Payment Service | Latency (p99) | < 500ms for 99.5% of requests | 30 days |
| User Service | Availability | 99.9% | 30 days |
| Notification Service | Availability | 99.5% | 30 days |

Notice the different targets. Not every service needs four nines of availability. The notification service can tolerate more errors than the payment service.

## Setting Up SLOs in OneUptime

### Step 1: Create the SLI Monitors

For each SLO, create a metric monitor in OneUptime that calculates the SLI:

```yaml
# Availability SLI for API Gateway
# OneUptime metric query:
name: "API Gateway Availability"
metric: istio_requests_total
filters:
  destination_service: "api-gateway.default.svc.cluster.local"
calculation: |
  successful = sum(rate(istio_requests_total{response_code!~"5.*"}[5m]))
  total = sum(rate(istio_requests_total[5m]))
  sli = successful / total
```

### Step 2: Configure the SLO

In OneUptime, set up the SLO with your target and window:

- **SLO Name**: API Gateway Availability
- **SLI Source**: The metric monitor you created above
- **Target**: 99.95%
- **Window**: 30 days (rolling)
- **Error Budget**: 0.05% (approximately 21.6 minutes per month)

### Step 3: Configure Error Budget Alerts

Set up alerts at different error budget consumption levels:

```yaml
# Alert when 50% of error budget is consumed
# This is a warning - you're burning budget faster than expected
alert_50_percent:
  condition: error_budget_remaining < 50%
  severity: medium
  notification: slack

# Alert when 75% of error budget is consumed
# This is urgent - slow down deployments and investigate
alert_75_percent:
  condition: error_budget_remaining < 25%
  severity: high
  notification: slack + email

# Alert when 90% of error budget is consumed
# This is critical - freeze changes and focus on reliability
alert_90_percent:
  condition: error_budget_remaining < 10%
  severity: critical
  notification: pagerduty
```

## Calculating Error Budgets

The error budget math is straightforward:

```
# For a 99.9% availability SLO over 30 days:
Total minutes in 30 days = 30 * 24 * 60 = 43,200
Error budget = 43,200 * 0.001 = 43.2 minutes of downtime allowed

# For a 99.95% availability SLO:
Error budget = 43,200 * 0.0005 = 21.6 minutes

# For a 99.99% availability SLO:
Error budget = 43,200 * 0.0001 = 4.32 minutes
```

In terms of requests, if you serve 1 million requests per day:

```
# 99.9% SLO over 30 days:
Total requests = 30,000,000
Allowed failures = 30,000 requests

# 99.99% SLO:
Allowed failures = 3,000 requests
```

## Building the SLO Dashboard

Create a dedicated SLO dashboard in OneUptime with these panels:

### Current SLO Status

A table showing each SLO with its current value:

```
| Service          | SLI Type     | Target  | Current | Budget Remaining |
|-----------------|-------------|---------|---------|-----------------|
| API Gateway      | Availability | 99.95%  | 99.97%  | 65%             |
| Payment Service  | Availability | 99.99%  | 99.992% | 42%             |
| User Service     | Availability | 99.9%   | 99.95%  | 85%             |
```

Color-code the "Budget Remaining" column: green > 50%, yellow 25-50%, red < 25%.

### Error Budget Burn Rate

Show how fast the error budget is being consumed:

```
# Burn rate = actual error rate / allowed error rate
# A burn rate of 1.0 means you're consuming budget exactly at the sustainable rate
# A burn rate of 2.0 means you'll exhaust your budget in half the window

burn_rate = (1 - current_sli) / (1 - slo_target)
```

A chart showing burn rate over time helps you spot trends. A gradually increasing burn rate might indicate a slow degradation that individual error rate alerts won't catch.

### Historical SLO Compliance

Show whether you met your SLO in previous periods:

```
| Month    | API Gateway | Payment | User Service |
|----------|------------|---------|-------------|
| Jan 2026 | 99.97%     | 99.993% | 99.92%      |
| Dec 2025 | 99.96%     | 99.998% | 99.88%      |
| Nov 2025 | 99.94%     | 99.991% | 99.95%      |
```

## Multi-Window SLO Alerts

A simple "error rate > threshold" alert is fine for catching outages, but it doesn't account for error budget. Use multi-window alerts for better SLO-based alerting:

```yaml
# Fast burn alert (2% of budget consumed in 1 hour)
# This catches sudden incidents
fast_burn:
  short_window: 5m
  long_window: 1h
  burn_rate_threshold: 14.4  # Consuming budget 14.4x faster than sustainable
  severity: critical

# Slow burn alert (5% of budget consumed in 6 hours)
# This catches gradual degradation
slow_burn:
  short_window: 30m
  long_window: 6h
  burn_rate_threshold: 6.0
  severity: high
```

The math behind this: for a 30-day window with 99.9% SLO, a burn rate of 14.4 means you'd exhaust your entire error budget in about 50 hours. That's urgent. A burn rate of 6 means you'd exhaust it in about 5 days, which is still bad but gives you more time to react.

## Tying SLOs to Business Decisions

SLOs aren't just technical metrics. They should drive business decisions:

- **Error budget remaining > 50%**: Green light for risky deployments and experiments
- **Error budget 25-50%**: Proceed with caution, prefer safer changes
- **Error budget < 25%**: Focus on reliability work, postpone feature deployments
- **Error budget exhausted**: Freeze deployments until reliability improves

This framework takes the subjectivity out of reliability discussions. Instead of arguing about whether the service is "reliable enough," you have objective data.

Start with one or two SLOs for your most critical services, get comfortable with the process, and then expand. Trying to define SLOs for every service at once is a recipe for overwhelming your team without getting value from any of them.
