# Validation Summary: How to Monitor Batch Jobs with Deadlines, Last Success, and Heartbeats

## Status
validated

## Post Type
Technical monitoring guide with PromQL expressions and metric exposition examples.

## Technologies Covered
- Prometheus and PromQL
- Prometheus Pushgateway
- Scheduled batch jobs, completion timestamps, deadlines and progress heartbeats

## Sources Consulted
- Prometheus Pushgateway guidance: https://prometheus.io/docs/practices/pushing/
- Prometheus instrumentation best practices, including batch jobs and timestamps: https://prometheus.io/docs/practices/instrumentation/
- PromQL operators, comparison filtering and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- PromQL functions, including `time()`: https://prometheus.io/docs/prometheus/latest/querying/functions/#time
- Prometheus jobs and instances, including `up`: https://prometheus.io/docs/concepts/jobs_instances/
- Prometheus text exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/
- Official Pushgateway README, including persistence, grouping, push metadata, PUT, POST and DELETE: https://github.com/prometheus/pushgateway
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Pushgateway durability was insufficiently qualified.** The post included a suitable Pushgateway deployment among external stores for durable success state without explaining its persistence limitations. Clarified that persistence is disabled by default, that `--persistence.file` enables restart persistence, and that crashes can still lose data. Recommended durable authoritative completion storage where such loss is unacceptable, consistent with the official Pushgateway documentation.
2. **The deadline expression does not retain missed-deadline evidence.** The expression detects an overdue run only while it lacks a qualifying success. A late success clears it, and a completion between evaluations can escape detection. Changed its description to overdue, incomplete work and explained that the scheduler must retain a run-specific completion time or deadline-missed outcome to answer whether the deadline was met. The existing expression remains valid for its clarified purpose.

## Review Notes
- Reviewed all three PromQL expressions against documented syntax and semantics. Comparisons filter without `bool`; `on (job_name)` controls matching; `and` restricts the heartbeat to running jobs; `unless` identifies expected jobs with no success series. The 900-second threshold represents 15 minutes, and `time()` supplies evaluation time in Unix seconds.
- Metric sample syntax is valid. The displayed epoch values are metric values in seconds, not optional exposition sample timestamps. These are custom metrics requiring instrumentation; the examples are not complete deployment configurations.
- Last-success tracking, stable grouping keys, avoiding run-ID cardinality and explicit deletion agree with official guidance. Pushgateway PUT replaces an entire group, supporting the warning about accidentally erasing previous success evidence; push metadata does not establish business success.
- Existing caveats about unique matching labels, overlapping runs, backfills, partitions, schedule availability and stale running state are appropriate. A production heartbeat exporter must provide a defined timestamp for each active run, including before its first checkpoint, or explicitly handle missing progress evidence.
- Referenced technical documentation and author profile resolve to the intended resources. No pinned versions or deprecated APIs were present, and there are no terminal command examples to execute.
- Validation was documentation-based with manual expression analysis; no live Prometheus or Pushgateway integration test was performed.
