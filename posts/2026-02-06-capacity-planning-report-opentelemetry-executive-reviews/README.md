# How to Build a Capacity Planning Report from OpenTelemetry Data for Executive Reviews

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Capacity Planning, Reporting, Executive Communication

Description: Turn raw OpenTelemetry metrics into a structured capacity planning report that engineering leaders and executives can act on.

Engineering leaders need capacity data translated into business terms: risk levels, cost impacts, and timelines. They do not need PromQL queries or P95 latency numbers. If your team is collecting telemetry with OpenTelemetry but struggling to communicate capacity status upward, this post walks through building a report that bridges that gap.

## What Executives Actually Need

A capacity planning report for leadership should answer four questions:

1. Are we at risk of an outage due to resource constraints?
2. How much are we spending vs. how much we need to spend?
3. When will we need to scale, and what will it cost?
4. What actions should we approve now?

Everything in the report should map back to one of these questions. Let us build the data pipeline to answer them.

## Collecting the Source Metrics

The report pulls from three categories of OpenTelemetry data: resource utilization, traffic volume, and cost allocation. Your collector should already be gathering these, but here is a configuration that ensures the right labels exist for grouping by team and service tier.

This collector config adds team ownership and service tier labels that are essential for executive-level grouping:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  k8sattributes:
    extract:
      metadata:
        - k8s.deployment.name
        - k8s.namespace.name
      labels:
        - tag_name: team
          key: team
          from: pod
        - tag_name: service_tier
          key: service-tier
          from: pod

  # Add cost metadata based on node type
  attributes:
    actions:
      - key: cost_center
        from_attribute: team
        action: upsert

exporters:
  prometheusremotewrite:
    endpoint: "http://prometheus:9090/api/v1/write"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [k8sattributes, attributes]
      exporters: [prometheusremotewrite]
```

## Building the Report Generator

This Python script pulls metrics from Prometheus and generates a structured report. It computes utilization summaries, identifies risks, and estimates costs.

This is the main report generator that queries all necessary metrics and organizes them by team and risk level:

```python
import requests
from datetime import datetime, timedelta
from collections import defaultdict

PROM_URL = "http://prometheus:9090"
REPORT_PERIOD_DAYS = 30

def query_prom(promql):
    """Execute a Prometheus query and return results."""
    resp = requests.get(f"{PROM_URL}/api/v1/query", params={"query": promql})
    resp.raise_for_status()
    return resp.json()["data"]["result"]

def query_prom_range(promql, days=30, step="1d"):
    """Execute a range query for trend analysis."""
    end = datetime.now()
    start = end - timedelta(days=days)
    resp = requests.get(f"{PROM_URL}/api/v1/query_range", params={
        "query": promql,
        "start": start.timestamp(),
        "end": end.timestamp(),
        "step": step
    })
    resp.raise_for_status()
    return resp.json()["data"]["result"]

def get_capacity_summary():
    """Build the top-level capacity summary by team."""
    summary = defaultdict(lambda: {
        "services": 0,
        "at_risk": 0,
        "overprovisioned": 0,
        "cpu_avg_util": 0.0,
        "mem_avg_util": 0.0,
        "total_cpu_cores": 0.0,
        "wasted_cpu_cores": 0.0
    })

    # Get average CPU utilization by team
    cpu_results = query_prom("""
        avg by (team) (
            rate(container_cpu_usage_seconds_total{container!="POD"}[7d])
            / on(pod, namespace)
            kube_pod_container_resource_requests{resource="cpu"}
        )
    """)

    for r in cpu_results:
        team = r["metric"].get("team", "unassigned")
        summary[team]["cpu_avg_util"] = float(r["value"][1])

    # Count services at risk (P95 CPU utilization > 80%)
    risk_results = query_prom("""
        count by (team) (
            quantile_over_time(0.95,
                (rate(container_cpu_usage_seconds_total{container!="POD"}[5m])
                / on(pod,namespace) kube_pod_container_resource_requests{resource="cpu"})
            [7d:1h]) > 0.80
        )
    """)

    for r in risk_results:
        team = r["metric"].get("team", "unassigned")
        summary[team]["at_risk"] = int(float(r["value"][1]))

    return dict(summary)

def estimate_cost_by_team():
    """Calculate current compute cost allocation per team."""
    # Cost per CPU core per month varies by instance type
    # This uses a blended rate
    COST_PER_CORE = 35.00
    COST_PER_GB = 5.00

    costs = {}
    cpu_results = query_prom("""
        sum by (team) (kube_pod_container_resource_requests{resource="cpu"})
    """)

    for r in cpu_results:
        team = r["metric"].get("team", "unassigned")
        cores = float(r["value"][1])
        costs[team] = {
            "cpu_cores_requested": cores,
            "monthly_cpu_cost": cores * COST_PER_CORE
        }

    return costs
```

## Formatting the Executive Report

Raw numbers need context. This function takes the collected data and formats it into a report with clear risk ratings and action items.

This formatter turns metric data into a structured markdown report with a traffic-light risk system:

```python
def generate_report(summary, costs, forecast):
    """Generate a formatted capacity planning report."""
    report_date = datetime.now().strftime("%B %d, %Y")

    report = f"""# Capacity Planning Report - {report_date}

## Executive Summary

| Team | CPU Utilization | Services at Risk | Monthly Compute Cost | Potential Savings |
|------|----------------|-------------------|---------------------|-------------------|
"""
    total_cost = 0
    total_savings = 0

    for team, data in sorted(summary.items()):
        cost_data = costs.get(team, {})
        monthly_cost = cost_data.get("monthly_cpu_cost", 0)
        total_cost += monthly_cost

        # Calculate potential savings from right-sizing
        if data["cpu_avg_util"] < 0.20:
            savings = monthly_cost * 0.50  # Could save 50%
        elif data["cpu_avg_util"] < 0.40:
            savings = monthly_cost * 0.25  # Could save 25%
        else:
            savings = 0
        total_savings += savings

        # Risk indicator
        if data["at_risk"] > 2:
            risk = "HIGH"
        elif data["at_risk"] > 0:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        report += (
            f"| {team} | {data['cpu_avg_util']:.0%} | "
            f"{data['at_risk']} ({risk}) | "
            f"${monthly_cost:,.0f} | ${savings:,.0f} |\n"
        )

    report += f"""
**Total Monthly Compute:** ${total_cost:,.0f}
**Identified Savings Opportunity:** ${total_savings:,.0f}/month

## Recommended Actions

"""
    # Generate action items based on the data
    for team, data in summary.items():
        if data["at_risk"] > 2:
            report += f"- **{team}**: Scale up {data['at_risk']} services immediately to reduce outage risk\n"
        if data["cpu_avg_util"] < 0.15:
            cost_data = costs.get(team, {})
            report += f"- **{team}**: Right-size resources to save ~${cost_data.get('monthly_cpu_cost', 0) * 0.5:,.0f}/month\n"

    return report
```

## Automating Report Delivery

Generate the report weekly and send it to Slack or email. A simple Kubernetes CronJob works well for this.

This CronJob runs the report generator every Monday morning and posts the result to a Slack channel:

```yaml
# capacity-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: capacity-report
  namespace: observability
spec:
  # Run every Monday at 8 AM UTC
  schedule: "0 8 * * 1"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: reporter
              image: capacity-report-generator:latest
              env:
                - name: PROMETHEUS_URL
                  value: "http://prometheus:9090"
                - name: SLACK_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: slack-webhooks
                      key: capacity-reports
                - name: REPORT_RECIPIENTS
                  value: "eng-leadership,finance"
          restartPolicy: OnFailure
```

## Making the Report Actionable

The difference between a report that gets ignored and one that drives decisions comes down to three things:

- **Attach dollar amounts to everything.** "Service X is overprovisioned" does not get budget approval. "Rightsizing service X saves $4,200 per month" does.
- **Include a timeline.** "We will hit capacity limits" is vague. "At current growth rates, the payments service will exceed its CPU allocation by March 15" gives leadership a deadline to work with.
- **Limit action items to three per report.** If you list 20 things that need attention, nothing gets prioritized. Pick the top three by impact and present those as the recommended actions.

The goal is to make capacity planning a regular, low-effort conversation rather than a fire drill. With OpenTelemetry feeding the data pipeline and an automated report, your team spends less time gathering numbers and more time making decisions.
