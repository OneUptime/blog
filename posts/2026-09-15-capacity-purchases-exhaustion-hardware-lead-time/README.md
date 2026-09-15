# How to Plan Capacity Purchases Around Forecasts and Hardware Delivery Delays

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Forecasting, Hardware, Resource Planning, Monitoring

Description: Translate capacity exhaustion scenarios into order-by dates that include purchasing, delivery, installation, and acceptance delays.

---

A forecast saying “capacity runs out in twelve weeks” is incomplete when procurement takes three weeks and hardware needs another eight weeks to arrive and become usable. The actionable output is an order-by date, backed by a forecast range and a plan for late delivery.

Separate the date demand exceeds safe capacity from the date new capacity becomes operational. Hardware at the loading dock is not usable production supply.

## Define exhaustion in operational units

Choose a capacity boundary that corresponds to an objective: tested peak requests per second, placeable Pod equivalents, usable replicated storage, or another measured unit. Raw disk bytes and installed cores are poor substitutes when placement, latency, redundancy, or I/O constrain service first.

Include required failure and maintenance allowances in the safe-capacity figure. State whether planned additions are already included and only count them from their expected acceptance dates. Microsoft's capacity-planning guidance recommends forecasting demand across scenarios and checking resource-specific performance limitations. [Azure Well-Architected capacity planning](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/capacity-planning)

For this illustrative model, use 1,000 units of safe supply and current peak demand of 760 units. Assume linear growth for the planning interval, then explicitly test whether that assumption survives upcoming releases and seasonal events.

## Calculate the first unsafe date

At 20 additional demand units per week, remaining time is:

```text
(1,000 - 760) / 20 = 12 weeks
```

At 30 units per week, the same supply lasts only eight weeks. These are deterministic scenarios, not confidence intervals. Do not call them P50 and P95 unless a calibrated probabilistic model supports those labels.

Use an integer calendar model when purchases and acceptance occur on daily boundaries:

```python
from datetime import date, timedelta
from math import ceil

as_of = date(2026, 9, 15)
safe_capacity = 1000
current_demand = 760
lead_days = 77

for weekly_growth in (20, 30):
    days = ceil((safe_capacity - current_demand) / (weekly_growth / 7))
    threshold_date = as_of + timedelta(days=days)
    order_by = threshold_date - timedelta(days=lead_days)
    print(weekly_growth, threshold_date, order_by)
# 20 2026-12-08 2026-09-22
# 30 2026-11-10 2026-08-25
```

Here the threshold date is when modeled demand reaches the safe boundary; capacity should be accepted no later than the start of that date. The high-growth order date has already passed. Issuing a normal purchase order now cannot satisfy that scenario without another mitigation.

Handle edge cases explicitly: if demand already reaches the boundary, the gap is immediate; if modeled growth is zero or negative, this linear model has no future crossing, but a planned event can still create one. Calculate the earliest crossing for a seasonal or step-change curve rather than fitting every history to a straight line.

## Model the path to accepted capacity

The example's 77-day planning allowance contains:

| Stage | Calendar days |
| --- | ---: |
| Internal purchasing and approval | 7 |
| Supplier fulfillment and shipping | 42 |
| Rack, power, networking, and installation | 7 |
| Burn-in, configuration, migration, and acceptance | 7 |
| Additional schedule allowance | 14 |

Add sequential stages; use a critical-path model for work that genuinely runs in parallel. Do not simply sum independently estimated P95 durations and call the result an end-to-end P95. Supplier delay, staffing, shipping, and facility readiness can be correlated.

Track dependencies such as available power, ports, licensed capacity, compatible spare parts, and migration throughput. A server delivered before its circuit is ready belongs in inventory, not in the available-capacity curve.

## Size the purchase beyond arrival day

If accepted new capacity arrives only just before exhaustion, buying enough for one extra week invites another emergency. Extend the demand curve through the next replenishment cycle and account for the increment sizes that can actually be deployed.

Compare alternatives using their usable capacity, acceptance date, and expected cost: an expedited purchase, temporary rented capacity, rescheduling batch work, or a measured efficiency improvement. Treat a proposed optimization as an uncertain supply improvement until it has been tested. Preserve failure reserves when evaluating each option.

## Use alerts as a review trigger

Prometheus `predict_linear` performs a linear extrapolation from gauge samples. It can help detect a trend toward exhaustion, but it does not understand delivery schedules or business events. [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

For an application-exported gauge of required capacity, a screening query might be:

```promql
predict_linear(required_capacity_units[28d], 77 * 24 * 3600)
  > on (pool) safe_capacity_units
```

This example assumes exactly one series per `pool` on each side, matching units, adequate history, and stable metric definitions. Adapt labels before use. Missing data must trigger its own monitoring condition; no result is not proof of sufficient supply.

Review the order-by dates on a cadence shorter than the remaining decision margin. Record actual order, shipment, installation, and acceptance dates, then compare forecasts with outcomes. The useful decision is whether to commit capacity now, change the arrival path, or reduce demand before the earliest credible crossing.
