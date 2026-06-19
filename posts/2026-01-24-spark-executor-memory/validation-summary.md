# Validation Summary: How to Fix 'Executor Memory' Spark Errors

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Apache Spark
- PySpark
- Spark executor and driver memory configuration
- Spark shuffle and spill behavior
- Spark REST API monitoring
- JVM garbage collection
- YARN and Kubernetes executor containers

## Sources Consulted
- Apache Spark Configuration documentation: https://spark.apache.org/docs/latest/configuration.html
- Apache Spark Monitoring and Instrumentation documentation: https://spark.apache.org/docs/latest/monitoring.html
- Apache Spark Tuning Guide: https://spark.apache.org/docs/latest/tuning.html
- Apache Spark Java API for SparkStatusTracker: https://spark.apache.org/docs/latest/api/java/org/apache/spark/SparkStatusTracker.html
- Apache Spark PySpark API reference for SparkContext.statusTracker: https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.SparkContext.statusTracker.html

## Issues Found
- The executor container memory explanation described the limit as only heap plus overhead. Updated it to include executor heap, memory overhead, configured off-heap memory, and separately configured PySpark executor memory, matching Spark's documented YARN/Kubernetes resource accounting.
- The memory architecture diagram placed Spark off-heap memory inside memory overhead. Updated the diagram and bullets to distinguish configured Spark off-heap memory from overhead/native/Python process memory.
- The memory overhead default was described as `max(384MB, 0.1 * executor memory)`. Updated it to use `spark.executor.memoryOverheadFactor` and `spark.executor.minMemoryOverhead`, which reflects current Spark configuration names and defaults.
- Deploy-time memory settings were shown without warning that they must be set before application startup. Added comments to the relevant examples to avoid implying that changing executor memory at runtime is reliable.
- The dtype optimization example used dictionary aggregation and positional result indexing, and could fail on all-null columns. Replaced it with explicit `min`/`max` aliases and an all-null guard.
- The partition optimization helper divided by zero for empty DataFrames. Added an empty DataFrame guard that keeps the current partitioning.
- The shuffle section used undocumented `spark.shuffle.spill` and described external shuffle service as enabling spill. Removed the invalid setting and clarified that shuffle spill is automatic when execution memory is insufficient.
- The shuffle section recommended setting `spark.shuffle.manager` to `sort`, which is not listed as a current Spark configuration in the official docs. Removed that setting and kept the documented sort-based shuffle threshold option.
- The PySpark executor monitoring example used `sc.statusTracker().getExecutorInfos()`, which is not available through the documented PySpark `StatusTracker` API. Replaced it with the documented Spark REST API executors endpoint.
- The stage metrics REST example used `/stages/{stage_id}` without selecting an attempt or requesting task details. Updated it to `/stages/{stage_id}/{stage_attempt_id}?details=true`.
- The stage metrics example read task memory metrics from the task object directly. Updated it to read `peakExecutionMemory` and `memoryBytesSpilled` from the task's `taskMetrics` object.
- The PySpark quick reference used `spark.python.worker.memory` as if it were the separate PySpark executor memory request. Added `spark.executor.pyspark.memory` for that purpose and clarified that `spark.python.worker.memory` is a Python aggregation spill threshold.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Several tuning values remain workload-dependent examples rather than universal recommendations, which is appropriate for a troubleshooting guide.
