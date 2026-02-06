# How to Implement FinOps for Observability: Enforce Cost Budgets Per Service and Team with Pre-Deployment Gates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, FinOps, Cost Management, Pre-Deployment Gates

Description: Implement FinOps practices for observability by enforcing per-team cost budgets with automated pre-deployment gates in CI/CD pipelines.

FinOps for observability means treating telemetry data the same way you treat cloud resources: with budgets, cost tracking, and governance. This post shows how to enforce observability cost budgets at the team and service level using pre-deployment gates that prevent cost overruns before they happen.

## The FinOps Approach to Observability

Traditional approach: Teams instrument everything, platform team gets the bill, CFO asks why the observability budget doubled last quarter.

FinOps approach: Each team has a monthly observability budget. A pre-deployment gate estimates the cost impact of changes and blocks deployments that would exceed the budget.

## Cost Budget Configuration

Define budgets in a central configuration:

```yaml
# budgets.yaml
observability_budgets:
  fiscal_month: "2026-02"

  teams:
    payments:
      monthly_budget_usd: 5000
      alerts:
        warning_threshold_pct: 75
        critical_threshold_pct: 90
      services:
        payment-api:
          max_spans_per_sec: 10000
          max_logs_per_sec: 5000
          max_metric_series: 500
        payment-processor:
          max_spans_per_sec: 5000
          max_logs_per_sec: 2000
          max_metric_series: 200

    catalog:
      monthly_budget_usd: 2000
      alerts:
        warning_threshold_pct: 80
        critical_threshold_pct: 95
      services:
        catalog-api:
          max_spans_per_sec: 5000
          max_logs_per_sec: 10000
          max_metric_series: 300

  # Cost rates
  rates:
    span_cost_per_million: 0.50
    log_cost_per_million: 0.30
    metric_series_cost_per_thousand_monthly: 5.00
    storage_cost_per_gb_monthly: 0.023
```

## Pre-Deployment Cost Estimator

Build a tool that estimates the cost impact of a deployment:

```python
# cost_estimator.py
import yaml
import sys
import json
import subprocess
from dataclasses import dataclass

@dataclass
class CostEstimate:
    team: str
    service: str
    estimated_monthly_cost: float
    current_monthly_spend: float
    budget_remaining: float
    over_budget: bool
    details: dict

class ObservabilityCostEstimator:
    def __init__(self, budgets_file, prometheus_url):
        with open(budgets_file) as f:
            self.budgets = yaml.safe_load(f)
        self.prometheus_url = prometheus_url
        self.rates = self.budgets["observability_budgets"]["rates"]

    def estimate_deployment_cost(self, team, service, manifest_path):
        """Estimate the observability cost of a deployment."""
        # Get current spend from Prometheus
        current_spend = self.get_current_spend(team)

        # Analyze the deployment manifest for instrumentation config
        instrumentation = self.analyze_manifest(manifest_path)

        # Look up service limits
        team_config = self.budgets["observability_budgets"]["teams"].get(team, {})
        service_config = team_config.get("services", {}).get(service, {})
        budget = team_config.get("monthly_budget_usd", 0)

        # Estimate new cost based on deployment
        span_rate = service_config.get("max_spans_per_sec", 1000)
        log_rate = service_config.get("max_logs_per_sec", 500)
        metric_series = service_config.get("max_metric_series", 100)

        # Calculate monthly cost
        seconds_per_month = 30 * 24 * 3600
        span_cost = (span_rate * seconds_per_month / 1_000_000
                     * self.rates["span_cost_per_million"])
        log_cost = (log_rate * seconds_per_month / 1_000_000
                    * self.rates["log_cost_per_million"])
        metric_cost = (metric_series / 1000
                       * self.rates["metric_series_cost_per_thousand_monthly"])

        estimated_monthly = span_cost + log_cost + metric_cost
        budget_remaining = budget - current_spend

        return CostEstimate(
            team=team,
            service=service,
            estimated_monthly_cost=round(estimated_monthly, 2),
            current_monthly_spend=round(current_spend, 2),
            budget_remaining=round(budget_remaining, 2),
            over_budget=current_spend + estimated_monthly > budget,
            details={
                "span_cost": round(span_cost, 2),
                "log_cost": round(log_cost, 2),
                "metric_cost": round(metric_cost, 2),
                "budget": budget,
            }
        )

    def get_current_spend(self, team):
        """Query Prometheus for current month spend."""
        import requests
        query = (
            f'sum(increase(spans_per_team_total{{team_name="{team}"}}[30d]))'
            f' * {self.rates["span_cost_per_million"]} / 1e6'
        )
        try:
            resp = requests.get(
                f"{self.prometheus_url}/api/v1/query",
                params={"query": query}
            )
            result = resp.json()["data"]["result"]
            if result:
                return float(result[0]["value"][1])
        except Exception:
            pass
        return 0.0

    def analyze_manifest(self, manifest_path):
        """Analyze a K8s manifest for OTel configuration."""
        with open(manifest_path) as f:
            manifest = yaml.safe_load(f)

        # Check for OTel env vars that affect cost
        otel_config = {}
        containers = (manifest.get("spec", {}).get("template", {})
                      .get("spec", {}).get("containers", []))
        for container in containers:
            for env in container.get("env", []):
                if env["name"].startswith("OTEL_"):
                    otel_config[env["name"]] = env.get("value", "")

        return otel_config


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--team", required=True)
    parser.add_argument("--service", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--budgets", default="budgets.yaml")
    parser.add_argument("--prometheus", default="http://prometheus:9090")
    args = parser.parse_args()

    estimator = ObservabilityCostEstimator(args.budgets, args.prometheus)
    estimate = estimator.estimate_deployment_cost(
        args.team, args.service, args.manifest
    )

    print(f"=== Observability Cost Estimate ===")
    print(f"Team: {estimate.team}")
    print(f"Service: {estimate.service}")
    print(f"Estimated monthly cost: ${estimate.estimated_monthly_cost}")
    print(f"Current month spend: ${estimate.current_monthly_spend}")
    print(f"Budget remaining: ${estimate.budget_remaining}")
    print(f"Over budget: {'YES' if estimate.over_budget else 'No'}")

    if estimate.over_budget:
        print("\nDEPLOYMENT BLOCKED: Would exceed observability budget")
        print("Suggestions:")
        print("  - Reduce sampling rate")
        print("  - Decrease log verbosity")
        print("  - Request a budget increase from your manager")
        sys.exit(1)
    else:
        print("\nDeployment approved from observability cost perspective")
        sys.exit(0)


if __name__ == "__main__":
    main()
```

## CI/CD Integration

Add the cost gate to your deployment pipeline:

```yaml
# .github/workflows/deploy.yaml
name: Deploy with Cost Gate
on:
  push:
    branches: [main]

jobs:
  cost-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install pyyaml requests

      - name: Observability Cost Gate
        env:
          PROMETHEUS_URL: ${{ secrets.PROMETHEUS_URL }}
        run: |
          python cost_estimator.py \
            --team ${{ github.event.repository.custom_properties.team }} \
            --service ${{ github.event.repository.name }} \
            --manifest k8s/deployment.yaml \
            --budgets budgets.yaml \
            --prometheus $PROMETHEUS_URL

  deploy:
    needs: cost-check
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: kubectl apply -f k8s/
```

## Budget Alert Rules

```yaml
# prometheus-rules.yaml
groups:
  - name: observability-finops
    rules:
      - alert: TeamNearObservabilityBudget
        expr: |
          (sum by (team_name)(
            increase(spans_per_team_total[30d]) * 0.0000005 +
            increase(logs_per_team_total[30d]) * 0.0000003
          )) / on(team_name) group_left
          observability_budget_usd > 0.75
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Team {{ $labels.team_name }} at 75% of observability budget"
```

## Wrapping Up

FinOps for observability creates accountability and prevents runaway costs. By combining budget definitions, cost estimation in CI/CD, and real-time budget tracking with alerts, you give teams the tools to manage their observability spend proactively rather than reacting to surprise bills at the end of the month.
