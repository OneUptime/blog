# How to Forecast Seasonal Traffic Without Sizing Everything to the Annual Maximum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Forecasting, Time Series, Autoscaling, Cloud Computing

Description: Decompose trend, recurring seasonality, and known events into a backtested forecast, then combine baseline and temporary capacity instead of provisioning the yearly peak all year.

---

An annual maximum is an observation from one interval, not a year-round requirement. Provisioning every service to that point wastes capacity, while ignoring the event that produced it risks an outage.

The practical alternative is to forecast demand by time bucket, attach uncertainty, and map each demand shape to baseline, scheduled, or reactive supply.

## Start with a capacity-driving demand metric

Choose a metric that correlates with the constrained resource. HTTP RPS may work for a uniform API, but bytes ingested, records transformed, concurrent sessions, or weighted operations can be better. Keep separate classes when one request type costs much more than another.

Build a time series at a resolution that preserves the shortest meaningful peak. A daily average erases a 15-minute login wave. For each bucket retain:

```text
timestamp and time zone
accepted and successful demand
request or job class
payload or work units
latency and errors
lost, rejected, or shed demand
deployments, incidents, campaigns, and holidays
```

Do not train only on completed throughput during saturation. If the service capped at 20,000 RPS while queues and rejected requests grew, 20,000 is a supply ceiling, not true demand. Reconstruct offered demand from gateway arrivals, client attempts, queue growth, and rejection counters where possible.

## Decompose the forecast

Model components independently:

```text
forecast = baseline trend
         * recurring seasonal factor
         * known event factor
         + scenario adjustment
```

Useful seasonal periods include hour of day, day of week, month, billing cycle, school term, and local holidays. Keep region and time zone when peaks move geographically. Treat a one-time marketing event as a regressor or scenario rather than teaching the model that it repeats every year.

Use prediction intervals or quantile forecasts, not a single line. The capacity plan might use the p50 forecast for cost projections and the p95 demand forecast for provisioning, provided the chosen quantile matches the reliability policy. This is a planning percentile across possible demand outcomes, not request-latency p95.

## Backtest as if each prediction were made in the past

Use rolling forecast origins. At each historical cutoff, train only on data available then and predict through the real provisioning horizon. Score both magnitude and timing:

```text
weighted absolute percentage error
peak underprediction
peak timing error
prediction-interval coverage
capacity shortfall minutes
```

Ordinary average error can look excellent while every holiday peak is underestimated. Weight shortage more heavily than surplus when availability is the main objective. Compare a complex model with simple baselines such as last week, the same holiday last year, and recent trend plus a seasonal factor.

Investigate structural breaks after pricing changes, migrations, new regions, or feature launches. Old seasonality may no longer apply.

## Translate each forecast bucket into resources

Use a current, load-tested conversion from demand to safe capacity:

```text
required units_t = ceil(forecast demand quantile_t / tested safe demand per unit)
```

Then apply failure-domain and maintenance requirements. Do not infer resource capacity from average CPU alone.

Suppose ordinary demand needs 12 instances, December weekends need 20, and a verified eight-hour sale forecast needs 42. Keeping 42 all year uses 367,920 instance-hours. A simplified plan with 12 all year, eight extra for eight weekends, and 22 extra for the eight-hour sale uses:

```text
baseline:        12 * 8,760 = 105,120 instance-hours
weekend uplift:   8 *   384 =   3,072 instance-hours
sale uplift:     22 *     8 =     176 instance-hours
```

Real billing and failure reserves will change those totals, but the example shows why demand-shaped supply matters.

## Match supply to predictability

Use three layers:

- baseline capacity for continuous load, redundancy, and small unexpected changes;
- scheduled or predictive capacity for recurring peaks and dated events;
- reactive autoscaling and load shedding for forecast error and unplanned bursts.

AWS predictive scaling is intended for recurring daily or weekly patterns and can launch ahead of forecast demand. AWS scheduled scaling changes desired, minimum, or maximum capacity at a specified time. Azure guidance likewise recommends scheduled scaling for predictable load and runtime metrics for unpredictable changes.

Start temporary capacity early enough to cover provisioning, application warmup, readiness, and load-balancer registration. Keep quotas and autoscaling maximums above the scenario requirement, and verify regional resource availability. A scaling configuration cannot create capacity beyond a hard maximum.

## Run an event readiness loop

Before an important season:

1. freeze a demand forecast with owners and assumptions;
2. load test the forecast mix and a higher uncertainty scenario;
3. verify dependency, quota, network, and storage headroom;
4. schedule capacity with a measured warmup buffer;
5. define overload protection and rollback conditions;
6. monitor forecast versus actual demand during the event;
7. scale down after the risk window and record forecast error.

Google SRE guidance distinguishes organic growth from inorganic demand such as launches and marketing campaigns and calls for forecasts beyond provisioning lead time. Treat forecast review as a recurring process, not an annual spreadsheet exercise.

## Conclusion

Forecast the capacity-driving demand at a resolution that preserves peaks, separate trend and recurring seasonality from one-time events, and backtest the exact horizon used for provisioning. Combine a reliable baseline with scheduled, predictive, and reactive capacity so rare peaks receive resources when needed without defining the entire year's footprint.

## Official Documentation

- [Google SRE Book: Demand Forecasting and Capacity Planning](https://sre.google/sre-book/introduction/)
- [Google SRE Book: Production Services Best Practices](https://sre.google/sre-book/service-best-practices/)
- [Azure Well-Architected Framework: Capacity planning](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/capacity-planning)
- [AWS predictive scaling for EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-predictive-scaling.html)
- [AWS scheduled scaling for EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html)
