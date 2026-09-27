# How to Calculate Cloudability Cost Ratios After Aggregation with Calculated Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Build Cloudability cost ratios from aggregated numerator and denominator values, with clear source types, zero-denominator handling, and report-level verification.

Suppose one team spends 10 on 10 units and another spends 90 on 30 units. Their unit rates are 1 and 3. The combined rate is 100 divided by 40, or 2.5. Averaging the two rates gives 2, which answers a different question.

Cloudability Calculated Metrics address this class of problem because IBM documents that they run against aggregated report results at query time. Business Metrics, by contrast, evaluate individual billing items during ingestion.

## Define the business question first

Write down the numerator, denominator, reporting period, currency, allocation policy, and grouping dimensions before building the formula. A discount ratio, cost per request, and utilization ratio can all use division but have different valid inputs.

For an initial cost-only example, compare amortized spend with total spend using measures available in your tenant:

```text
total_amortized_cost / unblended_cost
```

This is a cost-basis ratio, not a universal savings percentage. Upfront commitments and the selected period can make the relationship surprising. Use a name such as Amortized to Total Cost Ratio that describes what the arithmetic actually measures.

Choose inputs from the same supported data source. The metric definition's `source_type` must be `cost` or `usage`, and its referenced measures must match. Do not assume a cost measure and a utilization-only measure can be joined inside one expression.

## Create a reusable definition

In Organize > Business Mappings, create a Calculated Metric, select the Cost data source, choose a number format, and enter the formula using valid API measure names. Begin with Number formatting so a raw ratio of 0.8 is easy to inspect before applying percentage display conventions.

The API equivalent uses `/v3/calculated-metrics`. The following is a request body, not a complete authentication example:

```json
{
  "name": "Amortized to Total Cost Ratio",
  "description": "Ratio of aggregated amortized cost to aggregated total cost",
  "expression": "total_amortized_cost / unblended_cost",
  "source_type": "cost",
  "number_format": "number"
}
```

Use the endpoint's current authentication requirements when sending it. Confirm both measure names through the reporting metadata and preserve the returned calculated-metric identifier.

A shared definition changes all consuming reports when edited, including historical reports at their next query. Treat a formula edit as a reporting-policy change and record the old expression, new expression, owner, and reason.

## Validate aggregation explicitly

Add the numerator, denominator, and calculated ratio to the same small report. Group first by one business dimension, then remove that dimension to obtain an overall result.

Use this local fixture to check the expected mathematics:

```python
from decimal import Decimal

rows = [(Decimal("10"), Decimal("10")),
        (Decimal("90"), Decimal("30"))]
numerator = sum((n for n, d in rows), Decimal(0))
denominator = sum((d for n, d in rows), Decimal(0))
ratio = None if denominator == 0 else numerator / denominator
assert ratio == Decimal("2.5")
```

The overall report should recalculate from the aggregate inputs. Do not sum or average the displayed ratio column in a downstream spreadsheet. Retain numerator and denominator in exports so consumers can recompute the ratio at a different grain.

## Handle undefined and misleading ratios

A zero denominator makes the ratio undefined. IBM's documented expression language supports arithmetic but not conditional expressions, so do not invent `IF`, `CASE`, or `NULLIF` support in the formula.

Inspect how your tenant represents the zero case, and choose a reporting policy that distinguishes undefined from zero. A downstream presentation layer can display Not applicable while retaining the underlying values. Avoid adding an arbitrary epsilon: it manufactures an enormous ratio and conceals the missing denominator.

Negative costs and credits also require interpretation. For example, a denominator reduced by credits can reverse or amplify a ratio without any infrastructure change. Agree whether the KPI uses net or gross spend, and apply the same scope to both inputs.

## Conclusion

Use Calculated Metrics for arithmetic on aggregated values, then verify the result at multiple grouping levels. A trustworthy ratio keeps its numerator, denominator, and financial meaning visible wherever it is reused.

## Official Documentation

- [IBM query-time Calculated Metrics](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=spend-calculated-metrics)
- [IBM Calculated Metrics API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-calculated-metrics-end-point)
- [IBM ingestion-time Business Metrics](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=mapping-business-metrics-in-cloudability)
- [Python decimal arithmetic](https://docs.python.org/3/library/decimal.html)
