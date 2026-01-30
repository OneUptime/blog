# How to Implement Error Budget Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: SRE, Error Budget, Reliability, DevOps

Description: Learn how to implement error budget policies that balance feature velocity with reliability using SLOs and automated responses.

---

Error budgets are a cornerstone of Site Reliability Engineering (SRE), providing a quantitative approach to balancing innovation with reliability. Rather than pursuing impossible perfection, error budgets embrace the reality that some failure is acceptable and use it as a management tool to guide engineering decisions.

## What Are Error Budgets?

An error budget is the maximum amount of unreliability your service can tolerate while still meeting its Service Level Objective (SLO). If your SLO promises 99.9% availability, your error budget is the remaining 0.1% - approximately 43 minutes of downtime per month.

The key insight is that this budget can be "spent" on anything: planned maintenance, feature deployments, or unexpected incidents. When the budget is healthy, teams can move fast. When it is depleted, reliability work takes priority.

## Calculating Error Budgets from SLOs

Error budgets derive directly from your Service Level Objectives. Here is how to calculate them:

```python
class ErrorBudget:
    def __init__(self, slo_target: float, window_days: int = 30):
        self.slo_target = slo_target
        self.window_seconds = window_days * 24 * 60 * 60
        self.budget_seconds = self.window_seconds * (1 - slo_target)

    def remaining_budget(self, consumed_seconds: float) -> dict:
        remaining = self.budget_seconds - consumed_seconds
        percentage = (remaining / self.budget_seconds) * 100
        return {
            "total_budget_minutes": self.budget_seconds / 60,
            "consumed_minutes": consumed_seconds / 60,
            "remaining_minutes": remaining / 60,
            "remaining_percentage": percentage
        }

# Example: 99.9% SLO over 30 days
budget = ErrorBudget(slo_target=0.999, window_days=30)
status = budget.remaining_budget(consumed_seconds=1200)  # 20 minutes consumed
print(f"Budget remaining: {status['remaining_percentage']:.1f}%")
```

## Implementing Burn Rate Alerts

Rather than alerting only when the budget is exhausted, burn rate alerts notify you when consumption is accelerating beyond sustainable levels. A burn rate of 1.0 means you will exactly exhaust your budget by the window end. A burn rate of 10 means you are consuming budget ten times faster than sustainable.

```yaml
# Prometheus alerting rules for error budget burn rate
groups:
  - name: error_budget_alerts
    rules:
      - alert: ErrorBudgetFastBurn
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            / sum(rate(http_requests_total[1h]))
          ) > (14.4 * (1 - 0.999))
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error budget burning too fast"
          description: "At current rate, error budget exhausts in 2 hours"

      - alert: ErrorBudgetSlowBurn
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[6h]))
            / sum(rate(http_requests_total[6h]))
          ) > (6 * (1 - 0.999))
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Error budget burning steadily"
          description: "At current rate, error budget exhausts in 5 days"
```

## Policy Responses: What Happens When Budget Depletes

The real power of error budgets comes from predefined policies that trigger automatically based on budget status. Here is a tiered response framework:

```typescript
interface ErrorBudgetPolicy {
  threshold: number;
  actions: PolicyAction[];
}

const errorBudgetPolicies: ErrorBudgetPolicy[] = [
  {
    threshold: 50, // 50% budget remaining
    actions: [
      { type: 'notify', target: 'engineering-leads' },
      { type: 'increase_review', description: 'Require extra review for risky changes' }
    ]
  },
  {
    threshold: 25, // 25% budget remaining
    actions: [
      { type: 'freeze_feature_deploys', exceptions: ['critical-fixes'] },
      { type: 'escalate', target: 'engineering-director' },
      { type: 'schedule', activity: 'reliability-sprint' }
    ]
  },
  {
    threshold: 0, // Budget exhausted
    actions: [
      { type: 'full_deploy_freeze' },
      { type: 'redirect_resources', from: 'features', to: 'reliability' },
      { type: 'incident_review', scope: 'all-contributing-incidents' }
    ]
  }
];

async function enforcePolicy(budgetRemaining: number): Promise<void> {
  const applicablePolicy = errorBudgetPolicies
    .filter(p => budgetRemaining <= p.threshold)
    .sort((a, b) => a.threshold - b.threshold)[0];

  if (applicablePolicy) {
    for (const action of applicablePolicy.actions) {
      await executeAction(action);
    }
  }
}
```

## Stakeholder Communication

Transparent communication about error budget status is essential for organizational buy-in. Create dashboards that show budget consumption trends and automate regular reporting.

```python
def generate_weekly_report(budget_data: dict) -> str:
    return f"""
    == Weekly Error Budget Report ==

    Service: {budget_data['service_name']}
    SLO Target: {budget_data['slo_target']*100}%

    Budget Status:
    - Remaining: {budget_data['remaining_percentage']:.1f}%
    - Consumed this week: {budget_data['weekly_consumption']:.1f}%
    - Projected exhaustion: {budget_data['projected_exhaustion_date']}

    Top Contributors to Budget Consumption:
    {format_incidents(budget_data['incidents'])}

    Recommendation: {determine_recommendation(budget_data)}
    """
```

## Best Practices

When implementing error budget policies, start conservatively with SLOs slightly below what you currently achieve. This gives teams room to learn the system without immediate pressure. Ensure policies are agreed upon by all stakeholders before incidents occur, not during them. Finally, treat the error budget as a shared resource across teams, fostering collaboration rather than blame.

Error budgets transform reliability from an abstract goal into a concrete, measurable resource. By implementing clear policies around budget consumption, you create a framework where feature velocity and reliability naturally balance themselves.
