# Validation Summary: How to Forecast Seasonal Traffic Without Sizing Everything to the Annual Maximum

## Status
validated

## Post Type
Technical guide with forecasting formulas, capacity calculations, and operational implementation guidance. Although there are no executable code examples, commands, or configuration files, the technical implementation details require validation.

## Technologies Covered
- Capacity planning and load testing
- Time-series decomposition, event regressors, quantile forecasts, and rolling-origin backtesting
- AWS EC2 Auto Scaling predictive and scheduled scaling
- Azure autoscaling and capacity planning
- Google SRE practices, overload protection, and failure reserves

## Sources Consulted
- Google SRE Book, Introduction — Demand Forecasting and Capacity Planning: https://sre.google/sre-book/introduction/
- Google SRE Book, Production Services Best Practices: https://sre.google/sre-book/service-best-practices/
- Google SRE Book, Handling Overload: https://sre.google/sre-book/handling-overload/
- Azure Well-Architected Framework, Capacity planning: https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/capacity-planning
- Azure Architecture Center, Autoscaling: https://learn.microsoft.com/en-us/azure/architecture/best-practices/auto-scaling
- AWS EC2 Auto Scaling, Predictive scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-predictive-scaling.html
- AWS EC2 Auto Scaling, Scheduled scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- AWS Amazon Forecast, Evaluating Predictor Accuracy: https://docs.aws.amazon.com/forecast/latest/dg/metrics.html
- Hyndman and Athanasopoulos, Forecasting: Principles and Practice, Time series components: https://otexts.com/fpp3/components.html
- Hyndman and Athanasopoulos, Forecasting: Principles and Practice, Time series cross-validation: https://otexts.com/fpp3/tscv.html
- Hyndman and Athanasopoulos, Forecasting: Principles and Practice, Distributional forecasts and prediction intervals: https://otexts.com/fpp3/prediction-intervals.html
- Hyndman and Athanasopoulos, Forecasting: Principles and Practice, Some useful predictors: https://otexts.com/fpp3/useful-predictors.html
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
1. **Inconsistent December weekend count.** The example described December demand but budgeted eight full weekends (384 hours). Changed it to the four full weekends in December 2026, totaling 192 hours, and corrected the weekend uplift to 1,536 instance-hours. Explicitly identified the non-leap year underlying 8,760 annual hours. Verified the calendar and arithmetic locally.
2. **Unstated overlap in the sale calculation.** An uplift of 22 reaches 42 instances only when the 20-instance weekend capacity is already present. Specified that the eight-hour sale occurs within one of the uplift weekends. The sale uplift remains 176 instance-hours; outside a weekend, the required uplift would instead be 30 instances.
3. **Overgeneralized decomposition instruction.** The post instructed readers to model components independently and presented multiplication without its applicability condition. Changed this to separate components and explained that multiplicative effects suit proportional changes, while additive effects suit changes independent of the baseline level. This avoids implying statistical independence or universal suitability of multiplication.

## Review Notes
- Confirmed AWS predictive scaling addresses daily or weekly recurring patterns and can launch capacity ahead of forecast load. Scheduled scaling can set desired, minimum, or maximum capacity. Azure documentation supports combining scheduled scaling with runtime-metric scaling.
- Confirmed Google SRE guidance covers organic and inorganic demand, forecasting beyond acquisition lead time, and load testing to connect resource capacity with service capacity.
- Demand instrumentation, preserving short peaks, accounting for rejected demand, workload classes, resource limits, warmup, and dependency headroom are technically sound. Reconstruction should reconcile counters at consistent boundaries to avoid counting the same arrivals twice.
- Rolling-origin evaluation with only historically available data and the actual forecast horizon is appropriate. Event regressors and structural-break investigation are supported by forecasting literature.
- A demand p95 is a forecast quantile, not latency p95 or a guarantee of an availability SLO. The post correctly requires matching it to reliability policy. A p50 cost scenario is a median-demand scenario, not necessarily expected expenditure.
- WAPE is a valid aggregate metric but is undefined when total actual demand is zero. The additional peak, timing, coverage, and shortfall measures help address limitations of aggregate error scores.
- The per-unit capacity formula assumes the tested throughput remains representative at the planned fleet size and workload mix. Shared bottlenecks or uneven load can invalidate linear scaling; the stated load tests and dependency checks are essential.
- Recalculated all example values: 42 × 8,760 = 367,920; 12 × 8,760 = 105,120; 8 × 192 = 1,536; 22 × 8 = 176. The corrected simplified plan totals 106,832 instance-hours. Billing, warmup buffers, and failure reserves remain outside this illustrative total.
- All five documentation links resolve to relevant resources; the Google introduction contains the named capacity-planning subsection. The author link redirects to the expected GitHub profile.
- No executable code, CLI flags, API versions, or configuration schemas require runtime testing. Text blocks are conceptual formulas, metric lists, and arithmetic. No version-specific corrections were needed. Amazon Forecast documentation was consulted for metric definitions only; the post does not recommend deploying that service.
