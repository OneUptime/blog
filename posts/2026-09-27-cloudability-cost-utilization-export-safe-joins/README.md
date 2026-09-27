# How to Combine Cloudability Cost and Utilization Exports Without Misstating Billed Spend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Management, Data Analysis, API

Description: Combine Cloudability billing and utilization exports at a verified resource grain without duplicating spend or treating estimated utilization cost as invoiced cost.

Cost and utilization exports answer related but different questions. Billing data explains what was charged. Utilization data helps explain how a resource was used. Joining them can make a rightsizing discussion more useful, but a careless join can multiply spend or replace real charges with an estimate.

Keep financial amounts authoritative in the cost dataset and attach operational measurements only after defining a compatible reporting grain.

## Separate cost semantics

IBM's utilization-report documentation states that its Cost (Estimated) uses on-demand rates and covers compute instance hours, excluding other bill components such as bandwidth and storage. It is intended for trending rather than financial reporting. The classic `/reporting/util` endpoints documented here target AWS EC2 utilization; multi-cloud cost reporting does not imply equivalent utilization-endpoint coverage for every provider.

Do not add that estimate to billed cost or relabel it as an invoice amount. Name columns explicitly, for example `billing_amortized_cost` and `util_estimated_compute_cost`, and document the selected metric IDs. An amortized cost metric distributes commitment expense over time; do not equate its period total with a cash invoice total.

Keep the original cost and utilization exports alongside the joined dataset so a reviewer can trace each value back to its source.

## Choose and verify a common key

A practical starting point is a daily resource key containing vendor, account, region, and resource ID. The cost export may call the identifier `resource_identifier`, while utilization reports may expose an instance-specific name. Use the measures metadata to build a deliberate mapping between them.

Confirm the time range and timezone represented by each export. Do not join a monthly average to each daily cost row and then sum the average as if it were additive.

Resource IDs alone are insufficient when different accounts or regions can contain the same short identifier. Tags and owner names are useful attributes, but they should not replace stable identity keys.

## Aggregate each side before the join

Cost data may contain several billing categories per resource and day. Utilization data may contain several measurements or dimensions for the same resource. Joining these raw tables produces many-to-many expansion.

The following offline fixture illustrates the conservation check. It uses already-normalized, daily records from one vendor; it does not assume these are raw Cloudability response field names.

```python
from collections import defaultdict
from decimal import Decimal

cost_rows = [
    ("acct-a", "us-east-1", "i-demo", "2026-08-01", "12.50"),
    ("acct-a", "us-east-1", "i-demo", "2026-08-01", "2.50"),
    ("acct-a", "us-east-1", "i-other", "2026-08-01", "8.00"),
]
util_rows = [
    {"key": ("acct-a", "us-east-1", "i-demo", "2026-08-01"),
     "cpu_average_percent": Decimal("18.5")}
]
costs = defaultdict(Decimal)
for account, region, resource, day, amount in cost_rows:
    costs[(account, region, resource, day)] += Decimal(amount)
util = {}
for row in util_rows:
    if row["key"] in util:
        raise ValueError("Utilization side is not unique at the join grain")
    util[row["key"]] = row["cpu_average_percent"]
joined = [{"key": key, "cost": amount, "cpu": util.get(key)}
          for key, amount in costs.items()]
assert sum(row["cost"] for row in joined) == Decimal("23.00")
assert sum(value for value in costs.values()) == Decimal("23.00")
assert sum(row["cpu"] is None for row in joined) == 1
```

The example intentionally retains a billed resource with no utilization observation. A left join from cost preserves spend coverage; an inner join would discard that resource's eight units of cost.

## Preserve metric aggregation meaning

CPU averages are not additive. If utilization rows must be consolidated, use the documented statistic and an appropriate weighting basis. Averaging already-averaged percentages without observation counts or durations can produce a misleading result.

For each utilization metric, document whether it is a count, rate, maximum, average, or quantity over an interval. Also retain missing-data indicators. A resource with absent utilization is not proven idle.

Likewise, keep credits, adjustments, shared charges, and costs without resource identifiers visible in a separate residual category. The joined resource table may be useful while still covering only part of the overall bill.

## Reconcile before publishing

Check row uniqueness on both sides, cost before and after the join, matched spend, unmatched spend, and unmatched utilization records. Break these controls down by account and day so one accidental expansion cannot cancel another omission.

Refresh a completed period as a replacement snapshot when billing changes; append-only loading can duplicate corrected costs. Record the extraction times of both sources to explain freshness differences.

## Conclusion

Use billing data for financial amounts and utilization data for operational context. A verified grain, explicit metric semantics, left-join coverage, and conservation checks let the combined dataset support decisions without misstating spend.

## Official Documentation

- [IBM utilization semantics and measures](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-utilization-reports-end-point)
- [IBM cost reporting and measures](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
- [Python decimal arithmetic](https://docs.python.org/3/library/decimal.html)
