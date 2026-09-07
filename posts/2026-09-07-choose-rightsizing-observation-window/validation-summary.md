# Validation Summary: Choosing a Rightsizing Observation Window

## Status
validated

## Post Type
Technical guide to rightsizing observation windows, with illustrative telemetry and YAML decision records.

## Technologies Covered
- AWS Compute Optimizer and EC2 utilization metrics
- Azure Advisor VM rightsizing
- Google Compute Engine machine-type recommendations
- Java HotSpot JIT compilation and application warmup
- Database buffer caches
- YAML, time-series aggregation, capacity planning, and autoscaling

## Sources Consulted
- AWS rightsizing recommendation preferences: https://docs.aws.amazon.com/compute-optimizer/latest/ug/rightsizing-preferences.html
- AWS Compute Optimizer metrics: https://docs.aws.amazon.com/compute-optimizer/latest/ug/metrics.html
- AWS enhanced infrastructure metrics: https://docs.aws.amazon.com/compute-optimizer/latest/ug/enhanced-infrastructure-metrics.html
- Azure Advisor VM/VMSS cost recommendations: https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations
- Google Compute Engine machine-type recommendations: https://cloud.google.com/compute/docs/instances/apply-machine-type-recommendations-for-instances
- Oracle Java HotSpot performance enhancements, tiered compilation: https://docs.oracle.com/en/java/javase/17/vm/java-hotspot-virtual-machine-performance-enhancements.html
- PostgreSQL buffer-cache prewarming: https://www.postgresql.org/docs/18/pgprewarm.html
- AWS Well-Architected, sizing resources using workload metrics: https://docs.aws.amazon.com/wellarchitected/latest/framework/cost_type_size_number_resources_metrics.html
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/

## Issues Found
- Azure's “7 through 90 day periods” wording could imply arbitrary durations. Replaced it with the documented options: 7, 14, 21, 30, 60, and 90 days.
- The AWS 93-day option omitted its prerequisite. Added that it requires the paid enhanced infrastructure metrics feature.
- The one-minute telemetry example followed advice to resolve a 20-second spike without stating its limitation. Clarified that this example is suitable only when shorter spikes do not need to be resolved; averages and percentiles cannot recover detail lost during sampling or aggregation.
- A stable utilization percentile alongside a changing request rate does not establish that efficiency is changing. Qualified the explanation to recognize possible efficiency or workload-mix changes.

## Review Notes
- Confirmed AWS's 14-, 32-, and 93-day options, the monthly-pattern rationale for 32 days, and its use of maximum utilization points within five-minute intervals for EC2 recommendations. This aggregation behavior does not mean every peak influences the final recommendation: CPU percentile preferences can exclude the highest observations.
- Confirmed Google's previous-eight-days analysis and 60-second average CPU utilization, including documented limitations for brief and monthly spikes. The original Google URL redirects to the corresponding docs.cloud.google.com page.
- Two complete cycles and the suggested 14-to-32-day weekly window are planning heuristics, not vendor requirements or statistical guarantees. Seasonal events, growth, failure scenarios, and workload changes still require explicit assessment.
- Separating materially different configuration epochs, retaining required failure and warmup events, testing absent seasonal demand, and revisiting sizing as workload metrics change are technically sound planning guidance.
- Java compilation and database-cache warmup are real effects. Minutes, hours, and a full business cycle are workload-dependent possibilities, not guaranteed stabilization times.
- Parsed the YAML decision record successfully with PyYAML safe_load and checked that its 32-day window fits within its stated stable epoch. Its fields are author-defined metadata, not a vendor configuration schema. The separate release timeline is illustrative; releases 4.7 and 4.9 are not identified as public product versions.
- The text blocks are illustrative records, with no executable code, terminal commands, or deprecated API calls to run. No cloud deployment or load test was needed for this documentation review.
- All five official documentation links resolve to the intended resources. Azure's page was confirmed through direct HTTP retrieval and indexed official documentation after the browser fetch timed out. The author profile link is attribution rather than technical evidence.
