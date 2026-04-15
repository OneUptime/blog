# Validation Summary: How to Store Kubernetes Events and Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, partitioning, LowCardinality type)
- Kubernetes (events API, container metrics, pod lifecycle)
- kube-state-metrics
- cAdvisor

## Sources Consulted
- ClickHouse documentation: CREATE TABLE, MergeTree engine, partitioning — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: LowCardinality type — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation: Date/time functions (toYYYYMMDD, toStartOfHour, toStartOfMinute) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation: formatReadableSize — https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse documentation: uniqExact — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- Kubernetes documentation: Events API and event reasons — https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/
- Kubernetes documentation: Container states and termination reasons — https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
No technical issues found.

## Review Notes
- The Kubernetes event reason `OOMKilling` used in the schema comment and query is the event reason emitted by the kubelet when it OOM-kills a container. This is distinct from `OOMKilled`, which appears in the container's termination status. Both are correct in their respective contexts; the post correctly uses `OOMKilling` for the events table.
- The `BackOff` reason in the Pod Restart Analysis query refers to `CrashLoopBackOff`-related events, which is a reasonable proxy for restart analysis but will not capture all restart reasons (e.g., liveness probe failures emit `Unhealthy` / `Killing` events). This is acceptable for the tutorial's scope.
- The schemas are well-designed with appropriate use of `LowCardinality(String)` for fields with limited distinct values, which is a ClickHouse best practice for query performance and compression.
- The default Kubernetes event TTL is approximately 1 hour, making the post's closing point about long-term storage accurate and relevant.
