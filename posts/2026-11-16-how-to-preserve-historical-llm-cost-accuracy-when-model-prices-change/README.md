# How to Preserve Historical LLM Cost Accuracy When Model Prices Change

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Cost Optimization, Token Usage, Python

Description: Preserve usage, effective-dated rates, and pricing revisions so historical LLM cost reports survive model price changes.

A dashboard that multiplies last month's tokens by today's prices rewrites history whenever a model rate changes. The graph may suddenly show a cost improvement even though no past request became cheaper. Model aliases, negotiated discounts, cache pricing, and regional rates make that error harder to spot.

Separate immutable usage from the rate catalog and from priced results. This gives you two legitimate reports: what the requests cost under the applicable historical rules, and what the same workload would cost under a new proposal.

## Preserve the dimensions that select a rate

At request time, capture provider, account/project, deployment, resolved model version when available, service tier, region, modality, usage timestamp, raw usage, and usage completeness. Retain the exact provider response rather than only a precomputed dollar value.

Rate selection can depend on more than the model name. The [OpenAI pricing reference](https://developers.openai.com/api/docs/pricing) distinguishes input, output, cached input, and other pricing dimensions. Model-specific rules can also change the billable partition. Design the catalog to represent those rules instead of assuming every model has exactly two rates.

For each rate entry, store the source document or contracted price-sheet identifier, currency, unit quantity, effective start, exclusive effective end, and catalog revision. Use an explicit timezone, normally UTC, for effective boundaries.

## Use half-open effective intervals

This small Python example selects a historical rate for one fictional meter. The prices are illustrative and are not provider quotes:

```python
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

@dataclass(frozen=True)
class Rate:
    rate_id: str
    start: datetime
    end: datetime | None
    price_per_million: Decimal

UTC = timezone.utc
rates = [
    Rate("r1", datetime(2026, 1, 1, tzinfo=UTC),
         datetime(2026, 11, 1, tzinfo=UTC), Decimal("2.00")),
    Rate("r2", datetime(2026, 11, 1, tzinfo=UTC),
         None, Decimal("1.50")),
]

def price_usage(tokens, occurred_at):
    if tokens < 0 or occurred_at.utcoffset() is None:
        raise ValueError("Expected nonnegative tokens and an aware timestamp")
    matches = [r for r in rates if r.start <= occurred_at
               and (r.end is None or occurred_at < r.end)]
    if len(matches) != 1:
        raise ValueError("Missing or overlapping historical rate")
    rate = matches[0]
    return rate.rate_id, Decimal(tokens) * rate.price_per_million / Decimal(10**6)

assert price_usage(1000, datetime(2026, 10, 31, tzinfo=UTC)) == (
    "r1", Decimal("0.002")
)
assert price_usage(1000, datetime(2026, 11, 1, tzinfo=UTC)) == (
    "r2", Decimal("0.0015")
)
```

The end-exclusive interval ensures a request exactly at midnight matches one rate. In production, filter by the complete meter identity before applying this selection. Fail on missing or overlapping entries; choosing the latest row would conceal a catalog defect.

Use the provider's documented billing-time basis where it differs from request initiation. Store both initiation and completion times so cross-boundary requests can be investigated instead of guessed.

## Store the calculation as a versioned result

A priced row should reference its usage record, selected rate IDs, pricing-engine version, catalog revision, computation time, currency, and estimated amount. Use the combination of usage ID and pricing revision as a non-null unique key, and reuse the existing result on retries to make reprocessing idempotent.

Keep the original priced row when correcting a catalog mistake. Append a replacement revision and mark which revision is current for reporting. A published monthly report can remain tied to its original revision while a correction report explains the adjustment.

Use decimal arithmetic for rates and amounts. Python's [decimal documentation](https://docs.python.org/3/library/decimal.html) describes exact decimal representation and configurable rounding. Construct rates from strings, retain adequate precision internally, and apply the agreed rounding policy at the appropriate aggregation boundary. Rounding every tiny request to cents can erase most of the cost.

## Distinguish rate changes from usage corrections

A new price effective tomorrow should not reprice yesterday. A late usage event belongs to the historical interval when it occurred, even if ingestion happens next week. A correction to the original rate sheet may require a new pricing revision for that past interval.

Maintain both effective time and recorded time when you need to answer what was known at a particular reporting date. Those two timestamps explain why the same usage period can have an original estimate and a later corrected estimate without either being silently overwritten.

Unknown usage also needs its own state. Do not transform missing streamed token totals into zero just because a rate is available. Preserve an estimate separately and replace it only with a traceable correction.

## Reconcile actuals and label forecasts

Provider billing can include discounts, credits, rounding, capacity charges, and other services. Historical token estimates remain estimates until reconciled. Azure's [Cost Management data documentation](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data) describes delayed processing and estimated costs before invoicing; the same accounting distinction is useful in your own pipeline.

Publish separate fields for historical estimated cost, reconciled billed allocation, and current-price simulation. Never relabel a simulation as actual savings. A forecast can reuse past usage with a proposed catalog, but it must retain its scenario identifier.

Finally, test the instant before and at a price boundary, late-arriving usage, a missing rate, overlapping rates, and a corrected catalog revision. Those cases prove that the pipeline preserves history while still allowing reproducible corrections and useful planning.
