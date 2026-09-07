# Validating Savings Before Changing Cloud Commitments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Rightsizing, AWS, Cost Optimization

Description: Prove the post-rightsize usage baseline before buying or changing Reserved Instances, Savings Plans, or committed use discounts.

---

Rightsizing changes the demand that a commitment is meant to cover. Buying a Reserved Instance, Savings Plan, or committed use discount from pre-change usage can lock in the waste that the engineering change was supposed to remove.

Sequence the decisions: validate workload capacity, observe the new eligible baseline, then choose commercial coverage.

## Separate engineering savings from rate savings

Rightsizing reduces consumed resources or avoids capacity. A commitment reduces the rate for eligible usage in exchange for a term or spend obligation. Keep two scenarios:

```text
usage savings = old usage at comparable rates - new usage at comparable rates
rate savings = new on-demand-equivalent cost - cost with commitment
```

This prevents double-counting and makes risk visible. A commitment can lower the bill even if usage did not improve; a rightsize can improve efficiency without lowering cash cost while an existing commitment remains underused.

## Stabilize the new baseline

After rollout, wait through representative business and operational cycles. Confirm:

- service objectives and batch deadlines remain healthy;
- rollback is no longer likely;
- autoscaling minima and maxima are intentional;
- releases, failovers, and maintenance were represented;
- the new resource family, region, operating system, and tenancy are stable;
- temporary migration and canary capacity is removed;
- billing exports reflect the new configuration.

Exclude one-time overlap, but document it. Do not exclude a seasonal peak the platform still needs to serve.

AWS Savings Plans recommendations are based on historical usage in the selected lookback and do not forecast future usage. AWS explicitly advises choosing a period that reflects future use and using history after a recent optimization. Azure reservation guidance says purchases should follow consistent base usage and analyzes hourly usage. Google CUD recommendations similarly analyze historical usage and offer models for stable use or optimal net savings.

## Normalize eligible hourly usage

Commitments apply according to product-specific dimensions and scopes. Build an hourly series after existing discounts and exclusions are understood:

```text
hour
eligible on-demand-equivalent spend
existing commitment coverage
uncovered eligible spend
region and family constraints
account, project, or subscription scope
```

Use the provider's billing data and recommendation APIs rather than multiplying list prices alone. Enterprise agreements, licenses, credits, sharing rules, taxes, and negotiated rates can change economics.

For resource-based commitments, normalize quantities such as vCPU counts, memory capacity, and GPU counts within the applicable region and family constraints. For spend-based plans, normalize eligible currency per hour or other documented commitment unit.

## Evaluate coverage conservatively

The maximum safe commitment is rarely the observed peak. Model a stable base and several scenarios:

```text
scenario A: expected post-rightsize demand
scenario B: 20% demand decline
scenario C: service migration or architecture change
scenario D: region or family shift
scenario E: seasonal peak without committing the peak
```

For each, calculate total commitment cost, covered usage, unused commitment, on-demand overage, and net savings. Use current provider rules for term, payment option, exchange, cancellation, sharing, and scope.

Google's documentation explains a break-even example: with a 30 percent discount, an instance must run for more than 70 percent of the month for the commitment to beat standard rates. Its current recommender offers a stable-usage model and an optimal-savings model over the previous 30 days. Use the provider's scenario tools and current pricing for the specific product.

## Validate flexibility assumptions

Do not treat similarly named products as interchangeable:

- AWS Compute Savings Plans and EC2 Instance Savings Plans have different flexibility.
- Azure reservations and savings plans cover eligible usage under different matching rules.
- Google offers spend-based and resource-based CUDs with different units and scopes.
- A billing reservation may not reserve physical capacity. Azure documents that Reserved VM Instances provide a billing discount and do not guarantee compute capacity.

Check architecture, instance family, region, tenancy, operating system, and account sharing. A planned Graviton migration or regional evacuation can reduce the value of a narrow commitment.

## Use approval gates

Require at least:

```yaml
engineering:
  rightsize_validated: true
  rollback_window_closed: true
  observation_cycles: 2
financial:
  billing_data_complete: true
  existing_coverage_reconciled: true
  downside_scenario_positive: true
business:
  owner_forecast_approved: true
  migration_inside_term: false
```

Assign separate engineering and finance reviewers. Engineering owns future architecture and capacity; FinOps owns eligibility, effective rates, and portfolio coverage. Neither dataset is sufficient alone.

## Monitor after purchase

Track coverage, utilization, on-demand overage, and allocation by owner. Alert on sustained unused commitment and on architectural changes that alter eligibility. Reconcile new purchases or expirations before accepting another recommendation; provider recommendation systems need time to incorporate inventory changes.

Continue rightsizing. A commitment is not a reason to consume unnecessary resources. Freed coverage can often apply to other eligible usage, depending on product rules.

## Conclusion

Validate the post-rightsize workload and billing baseline before changing commitments. Model eligible hourly usage under downside and migration scenarios, verify scope and flexibility, and require engineering plus finance approval. Report usage savings separately from rate savings and monitor coverage throughout the term.

## Official Documentation

- [AWS Savings Plans recommendation calculations](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-rec-calculations.html)
- [AWS Savings Plans overview](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [Azure reservation purchase analysis](https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/determine-reservation-purchase)
- [Azure Reserved VM Instance scope and capacity behavior](https://learn.microsoft.com/en-us/azure/virtual-machines/prepay-reserved-vm-instances)
- [Google Cloud committed use discounts](https://cloud.google.com/docs/cuds)
- [Google Cloud CUD recommendations](https://cloud.google.com/docs/cuds-recommender)
