# Calculate Revenue, Error Budget, and Customer Impact After an Incident

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Error Budget, Business Impact, SLO

Description: Calculate incident impact with explicit denominators, deduplicated customer counts, error-budget arithmetic, and revenue estimates that account for recovery.

An incident produced 240 failed requests. That does not mean 240 lost customers, 240 lost orders, or 240 times the average order value in lost revenue. Retries, shared accounts, delayed purchases, and measurement gaps separate those quantities.

A useful postmortem reports each measure with its unit, time window, evidence source, and uncertainty. The calculations below use a fictional checkout incident and a runnable Python example. They demonstrate arithmetic, not findings from a real business.

## Freeze the measurement definitions

Record the impact interval separately from detection and recovery actions. In this example, impact ran from 15:00 inclusive to 15:20 exclusive UTC. Use the same boundary convention when joining requests, checkout attempts, and completed orders.

The request service-level indicator, or SLI, counts eligible API requests as good or bad according to an existing definition. The service-level objective, or SLO, sets the target fraction of good requests. Reuse the approved eligibility rules; do not remove inconvenient failures after the incident to improve the result. [Defining SLIs and error budgets](https://sre.google/workbook/implementing-slos/)

The fictional evidence contains:

| Measure | Value | Unit and scope |
|---|---|---|
| Eligible requests during impact | 6,000 | Request attempts in the 20-minute interval |
| Bad requests attributable to this incident | 240 | Same eligibility and interval |
| Checkout attempts experiencing at least one failure | 150 | Deduplicated by checkout identifier |
| Affected identified accounts | 42 | At least one affected checkout |
| Active identified accounts | 200 | Same service and interval |
| Affected checkouts eventually completed | 120 | Reconciled through 24 hours after impact |

Anonymous activity requires a separate coverage statement. Forty-two accounts are not necessarily 42 people, and unidentifiable activity must not be silently classified as unaffected.

## Count customers and retries at the right level

Preserve request failures when calculating a request-based SLI, even if a retry later succeeds. For customer impact, deduplicate using the relevant account or user identifier. For business outcomes, follow the checkout or order identifier through completion.

In the example, the request failure fraction is 240/6,000, or 4%. The affected-account fraction is 42/200, or 21% of identified active accounts. These different percentages are compatible because one account can generate many requests.

Of the 150 affected checkout attempts,120 eventually completed and 30 had not completed by the reconciliation cutoff. Report that observed outcome without declaring all 30 permanently lost sales. Some attempts might have been abandoned even without the incident.

Keep payment attempts separate from paid orders. A repeated purchase event should not become additional revenue. As one concrete instrumentation example, Google Analytics documents `transaction_id` as a unique transaction identifier used to avoid duplicate purchase events. Your authoritative order ledger still needs its own reconciliation rules. [Purchase event fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase)

## Calculate error-budget impact using the SLO denominator

An error budget is the allowed amount of bad service under the objective. For a request-based SLO, calculate it from eligible requests in the SLO period, not from outage minutes.

Assume a fixed, completed 30-day review period containing 1,000,000 eligible requests and a 99.9% objective. There were 620 other bad requests in that period, in addition to this incident's 240.

| Calculation | Result |
|---|---|
| Allowed bad requests: 1,000,000 ×(1−0.999) | 1,000 |
| Incident share of period budget: 240/1,000 | 24% |
| Total period consumption: (620+240)/1,000 | 86% |
| Unused allowance for that completed period: 1,000−860 | 140 bad requests |

The 140 is a retrospective remainder for that defined period, not a promise about today's rolling budget. With a rolling window, both the requests and failures included in the calculation change over time.

During the incident, the 4% bad-request ratio was 40 times the 0.1% ratio allowed by the SLO. This is a 40× burn rate. It is not the same quantity as 24% of the full period's budget. [Burn-rate interpretation](https://sre.google/workbook/alerting-on-slos/)

Do not derive budget consumption from 20 minutes divided by 30 days unless you are actually using an appropriate time-based SLI. Traffic during those minutes may differ sharply from average traffic. Also avoid counting the same bad request twice when two overlapping incidents contributed to it; record the attribution policy and shared contribution separately.

## Estimate revenue with an explicit baseline

Revenue impact needs a counterfactual: an estimate of what would have happened without the incident. Compare relevant historical periods or an unaffected cohort, accounting for promotions, seasonality, traffic mix, and other changes. Record the method and its limitations.

For this fictional case, a reviewed baseline predicts 340 paid orders during the impact interval, with a sensitivity range of 330–350. The ledger records 300 paid orders during the interval.

Of the 120 affected checkouts that eventually completed,100 completed during the interval and are already included in those 300 orders. Only 20 completed afterward. Subtract those 20 once when estimating delayed demand recovered within the 24-hour cutoff.

The central modeled unrecovered gap is 340−300−20=20 orders. At a defined average net order value of USD 40, the modeled revenue opportunity impact is USD 800. Varying the baseline from 330 to 350 gives USD 400–1,200. This is a sensitivity range, not a statistical confidence interval or a verified accounting loss.

Define “net order value” with the business owner, including treatment of discounts, refunds, taxes, shipping, and currency. Keep credits, incident-response costs, and longer-term retention effects in separate categories rather than quietly adding them to this order model.

## Reproduce the arithmetic

Save this as `impact.py` and run `python3 impact.py`. It uses Python's standard-library `Decimal` to represent decimal quantities directly. Constructing decimal constants from strings avoids introducing binary floating-point approximations. [Decimal arithmetic](https://docs.python.org/3.13/library/decimal.html)

```python
from decimal import Decimal as D

def budget(period_requests, other_bad, incident_requests, incident_bad, target):
    if not (0 < target < 1 and 0 < incident_requests <= period_requests):
        raise ValueError("Invalid target or request denominator")
    if not (0 <= incident_bad <= incident_requests):
        raise ValueError("Incident failures exceed eligible requests")
    if not (0 <= other_bad <= period_requests - incident_requests):
        raise ValueError("Other failures exceed requests outside the incident")
    allowed = D(period_requests) * (1 - target)
    rate = D(incident_bad) / D(incident_requests)
    return {
        "request_failure_percent": rate * 100,
        "incident_budget_percent": D(incident_bad) / allowed * 100,
        "period_budget_percent": D(other_bad + incident_bad) / allowed * 100,
        "unused_error_allowance": allowed - other_bad - incident_bad,
        "burn_rate": rate / (1 - target),
    }

def revenue_gap(expected, paid_during, recovered_later, net_value):
    if min(expected, paid_during, recovered_later, net_value) < 0:
        raise ValueError("Counts and value must be nonnegative")
    gap = max(D(0), D(expected) - paid_during - recovered_later)
    return gap * net_value

result = budget(1_000_000, 620, 6_000, 240, D("0.999"))
for name, value in result.items():
    print(f"{name}={value:.2f}")
print(f"affected_account_percent={D(42) / D(200) * 100:.2f}")
for expected in (330, 340, 350):
    value = revenue_gap(expected, 300, 20, D("40.00"))
    print(f"baseline_{expected}_revenue_usd={value:.2f}")
```

Expect request failures 4%, incident budget use 24%, period use 86%, unused allowance 140, burn rate 40, and affected accounts 21%. The three revenue outputs are 400, 800, and 1,200 USD. If unused allowance is negative for another valid input, the period exceeded its budget; do not hide that by clamping it to zero.

The code accepts already reconciled aggregates. It does not join raw events, deduplicate customers, infer causation, or validate the business baseline. Those are separate evidence tasks.

## Publish observed impact and modeled impact separately

A compact impact statement for the fictional case is:

> The 20-minute incident produced 240 bad eligible requests out of 6,000 and affected 42 of 200 identified active accounts. It consumed 24% of the defined review period's request error budget. At 24 hours, 30 of 150 affected checkouts had not completed. A separate baseline model estimates USD 800 in unrecovered revenue opportunity, with a USD 400–1,200 sensitivity range.

Attach the query definitions, snapshot or export identifiers, reconciliation cutoff, model assumptions, and responsible reviewers. Record gaps in telemetry coverage and revise the figures if delayed records materially change them.

That separation lets readers understand what was measured, what was inferred, and which decisions each number can reasonably support.
