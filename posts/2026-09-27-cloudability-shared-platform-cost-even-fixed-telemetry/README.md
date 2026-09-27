# Cloudability Shared Costs: Even Splits, Fixed Weights, and Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Allocation, Shared Costs

Description: Choose and verify Cloudability shared-cost allocation methods using an explicit source pool, business dimension, and reproducible usage weights.

A shared platform bill can be correct while every application's cost report is incomplete. The platform team pays for infrastructure that several product teams consume, and resource ownership alone does not explain which products should absorb that expense.

Cloudability Cost Sharing lets you distribute a source cost bucket among destination values within one Business Dimension. Start by agreeing what the pool represents and how recipients benefit, then choose an allocation method. A sophisticated formula cannot repair an ambiguous ownership policy.

## Define a source pool that can be reconciled

Suppose the Product dimension has four values: Platform, Checkout, Search, and Analytics. In the example period, Platform contains $12,000 of eligible shared expense. Keep dedicated Checkout infrastructure outside this source pool because it already belongs directly to Checkout.

Record the reporting dates, currency, cost metric, source value, and eligible destinations. Also record whether the pool contains tax, credits, or commitment-related charges. Those are policy decisions; consistency matters more than making the shared-cost total look large.

Cloudability rules operate within a single Business Mapping. Open Cost Sharing under **Organize**, select the dimension, and add a rule with the relevant sources, destinations, and method. Current releases group the feature under **Cost Sharing & Telemetry**; older documentation calls the area **Cost Sharing**. The Explorer provides a place to inspect the result. [IBM Cost Sharing guide](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=setup-cloudability-cost-sharing-in-cloudability)

## Compare methods using the same $12,000

The following figures are an original allocation worksheet, not output copied from Cloudability:

| Method | Checkout | Search | Analytics |
| --- | ---: | ---: | ---: |
| Even split | $4,000 | $4,000 | $4,000 |
| Fixed weights: 50%, 30%, 20% | $6,000 | $3,600 | $2,400 |
| Usage shares: 60%, 25%, 15% | $7,200 | $3,000 | $1,800 |

An even split works when the service provides similar baseline value to each recipient, such as access to a common engineering platform. It is easy to explain and audit, but adding a team changes every existing team's share.

Fixed weighting works when the organization has negotiated a stable distribution. The percentages should have a named owner and review date. A team that no longer uses the service should not keep paying because an old spreadsheet was forgotten.

IBM documents even, fixed, direct-charge-proportional, and telemetry allocation strategies. Direct-charge weighting and usage weighting answer different questions: a team's unrelated cloud spend is not a measurement of its platform consumption. [Allocation methods and rule import](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=setup-sharing-cost-in-cloudability)

## Prepare telemetry before creating the rule

For a shared API platform, request counts might be a useful driver if requests have roughly similar processing cost. If large analytical calls consume far more capacity than simple lookups, raw request count could shift cost toward the wrong customers. Decide whether the metric measures demand, reserved capacity, or delivered work.

IBM introduced centralized telemetry on July 1, 2026. In the current workflow, go to **Organize > Cost Sharing & Telemetry > Telemetry Metrics** and register the metric once for reuse across allocations. CSV uploads use dates, tag columns, and values; Cloudability detects the tag columns. Use the template and field mapping in that uploader, with the product tag carrying Checkout, Search, or Analytics. A Datadog integration can supply reusable metrics as well. [Centralized Telemetry release notes](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=cloudability-whats-new-in)

Older allocation-specific documentation describes an allocation's **Telemetry Data** tab and a **Telemetry / Consumption** rule whose destinations come from that file. Its CSV has dates, destination categories, and a named measurement column. The example below follows that older uploader's documented pattern; it is not the centralized Telemetry Metrics CSV schema. If your tenant presents the newer uploader, use its current template instead. Check your subscription and available workflow before preparing a production import. [Allocation-specific telemetry documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=setup-cloudability-cost-sharing-telemetry-consumption-based-allocations)

```csv
Date,Category,Number of API requests
2026-08-14,Checkout,60000
2026-08-14,Search,25000
2026-08-14,Analytics,15000
```

For that allocation-specific format, category spelling must match the intended dimension values. In the centralized workflow, verify the equivalent mapping from the selected telemetry tag to the allocation recipients. Do not substitute account IDs simply because they are easier to extract from telemetry.

Before uploading, check duplicate category/date records, missing days, negative counts, and an all-zero denominator. Agree how missing telemetry should be handled operationally; do not assume the product implements your desired fallback. Preserve the input file and document any correction.

## Validate allocation separately from display

Use a completed, small period for the first review. Confirm the eligible source amount independently, calculate expected recipient shares, and compare them with the allocation Explorer. Reconcile shared cost received by all destinations to the allocated source amount, allowing only an explained rounding difference.

Then build the consumer report. Native reports and supported dashboard widgets have their own Cost Sharing toggle; a saved report without allocation applied can legitimately show another distribution. [Cost Sharing in reports and dashboards](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=cloudability-cost-sharing-reports-dashboards)

Keep a direct-cost report alongside the allocated report so recipients can distinguish owned infrastructure from a platform charge. Review the model when teams join, services change, or the telemetry definition changes.

## Conclusion

Use the simplest allocation method that represents the service fairly. A defensible model has a bounded source pool, explicit recipients, preserved weights, and a reconciliation that someone outside the platform team can reproduce.
