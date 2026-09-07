# Choosing a Rightsizing Observation Window

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rightsizing, Capacity Planning, Performance, Cost Optimization

Description: Choose a measurement window that captures recurring demand, rare peaks, releases, and enough stable data for a defensible rightsizing decision.

---

A rightsizing result is only as reliable as the history behind it. Seven quiet days can make an instance look wasteful even when it runs a month-end close. Ninety days can also mislead if they combine three old releases with a substantially different current workload.

The objective is not to collect the largest possible dataset. It is to collect enough representative data from one clearly understood operating regime.

## Start with the workload calendar

List the events that can change demand before choosing a number of days:

- intraday peaks, such as login or trading hours;
- weekday and weekend patterns;
- weekly imports, backups, and maintenance;
- month-end, quarter-end, or billing runs;
- product launches and marketing events;
- deployments, feature flags, migrations, and cache warmups;
- failovers, replica rebuilds, and disaster recovery tests.

The window must include the longest relevant recurring cycle. A useful starting rule is to capture at least two complete cycles so that one abnormal occurrence does not define the recommendation. For a stable API with a weekly pattern, 14 to 32 days can be reasonable. A financial workload with quarter-end processing needs a longer study or a separate capacity policy for that event.

This is consistent with the options exposed by cloud tools. AWS Compute Optimizer supports 14, 32, and 93 day lookback periods for customizable rightsizing preferences; AWS specifically notes that 32 days can capture monthly patterns. Azure Advisor offers 7 through 90 day periods for eligible VM recommendations. Google Compute Engine machine-type recommendations use the previous eight days of metrics and base CPU analysis on 60-second averages; Google warns that this can miss brief CPU spikes and infrequent monthly spikes. Those are product settings, not universal proof that a workload is represented.

## Split history into configuration epochs

Do not calculate one percentile across data that belongs to different systems. Mark every event that changes the relationship between demand and resource use:

```text
2026-06-01  release 4.7, old cache
2026-07-12  query index added
2026-08-03  traffic shifted from region B
2026-08-20  release 4.9, current code
```

The current recommendation should normally use the epoch beginning on August 20. Older periods are useful for comparison and for identifying seasonal events, but mixing them into one distribution can preserve capacity that a fixed query no longer needs.

Wait through normal warmup after a deployment. A Java service may compile hot methods and populate caches for minutes or hours. A database may need a full business cycle before the buffer cache and maintenance work reach a representative state.

## Preserve the peaks your service must survive

Aggregation can erase the very evidence needed for safe rightsizing. A five-minute average will understate a 20-second CPU spike. Keep a resolution shorter than the overload interval that could violate the service objective. AWS Compute Optimizer, for example, uses the maximum utilization point within each five-minute interval for EC2 recommendations.

Retain several views of the same period:

```text
resolution: 1 minute
statistics: average, p95, p99, maximum
dimensions: resource, instance, replica, zone, deployment version
business context: requests, records, jobs, queue depth
```

Classify peaks instead of deleting them. A monitoring-agent bug can be excluded with a recorded reason. A real failover, cache rebuild, or launch should remain if the replacement configuration must handle it again.

## Test whether the window is complete

Before accepting a recommendation, answer these questions:

1. Did the window contain every normal calendar cycle?
2. Did it include at least one representative deployment and warmup?
3. Was the resource configuration stable for most of the window?
4. Were telemetry gaps, stopped instances, and failed scrapes identified?
5. Did the service experience realistic traffic, data volume, and replica count?
6. Was a known seasonal peak absent?

If the last answer is yes, do not simply wait months while paying for obvious waste. Create two requirements: a steady-state size derived from current data and a scheduled or autoscaled peak plan validated with replay or load testing.

## A practical selection method

Use a small decision record for every workload:

```yaml
workload: checkout-api
decision_date: 2026-09-07
stable_epoch_start: 2026-08-03
recurring_cycles:
  daily: true
  weekly: true
  monthly: false
required_events:
  - normal deployment
  - cache warmup
  - promotion traffic test
window_days: 32
sample_interval_seconds: 60
known_gaps:
  - 18 minutes during metrics maintenance
next_seasonal_review: 2026-11-01
```

Compare adjacent windows as a stability test. If the recommended CPU changes materially between days 1 to 14 and days 15 to 28, investigate demand growth, a release, or an incomplete cycle. A stable percentile with an unstable request rate can still be unsafe because efficiency is changing.

## Recompute when the system changes

Expire a recommendation after a material deployment, topology change, new customer cohort, or changed scaling policy. Also expire it when the forecasted growth consumes the planned headroom. Rightsizing is a control loop, not a one-time inventory cleanup.

Record why a period was selected, not just its timestamps. That makes the decision reviewable when someone later asks whether Black Friday, a restore, or the latest deployment was represented.

## Conclusion

Choose an observation window from workload behavior, not a default dashboard range. Capture at least two relevant cycles, isolate the current configuration epoch, retain peak-resolution data, and explicitly account for missing seasonal events. Recompute whenever the workload or its scaling behavior changes.

## Official Documentation

- [AWS Compute Optimizer rightsizing recommendation preferences](https://docs.aws.amazon.com/compute-optimizer/latest/ug/rightsizing-preferences.html)
- [AWS Compute Optimizer metrics](https://docs.aws.amazon.com/compute-optimizer/latest/ug/metrics.html)
- [AWS Compute Optimizer enhanced infrastructure metrics](https://docs.aws.amazon.com/compute-optimizer/latest/ug/enhanced-infrastructure-metrics.html)
- [Azure Advisor VM rightsizing recommendations](https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations)
- [Google Compute Engine machine-type recommendations](https://cloud.google.com/compute/docs/instances/apply-machine-type-recommendations-for-instances)
