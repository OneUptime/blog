# Validation Summary: Diagnose `FetchFailedException` After a Spark Executor Dies

## Status
validated

## Post Type
Troubleshooting and performance-tuning guide

## Technologies Covered
- Apache Spark 4.2.0
- Spark shuffle map and reduce stages
- `FetchFailedException` and `FetchFailed` recovery
- Spark executors and dynamic resource allocation
- Netty shuffle transport and retry configuration
- External shuffle service
- Shuffle checksums and local storage
- Spark Web UI, History Server, event logs, and REST API
- Spark deployment on standalone, YARN, and Kubernetes cluster managers

## Sources Consulted
- [Spark `FetchFailed` API](https://spark.apache.org/docs/latest/api/scala/org/apache/spark/FetchFailed.html)
- [Spark Configuration](https://spark.apache.org/docs/latest/configuration.html)
- [Spark Web UI](https://spark.apache.org/docs/latest/web-ui.html)
- [Spark Monitoring and Instrumentation](https://spark.apache.org/docs/latest/monitoring.html)
- [Spark RDD Programming Guide: Shuffle Operations](https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations)
- [Spark Job Scheduling: Dynamic Resource Allocation](https://spark.apache.org/docs/latest/job-scheduling.html#dynamic-resource-allocation)
- [Spark Submitting Applications](https://spark.apache.org/docs/latest/submitting-applications.html)
- [Spark Running on YARN: Configuring the External Shuffle Service](https://spark.apache.org/docs/latest/running-on-yarn.html#configuring-the-external-shuffle-service)
- [Spark Standalone Mode](https://spark.apache.org/docs/latest/spark-standalone.html)
- [Spark 4.2.0 `FetchFailedException` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/shuffle/FetchFailedException.scala)
- [Spark 4.2.0 `DAGScheduler` source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/scheduler/DAGScheduler.scala)
- [Spark 4.2.0 stage task-table source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/ui/jobs/StagePage.scala)
- [Spark 4.2.0 event-log writer source](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/deploy/history/EventLogFileWriters.scala)

## Issues Found
1. **The recovery description attributed scheduler internals directly to the `FetchFailed` API, called the outcome a single retry, and classified every repeated failure in one shuffle as infrastructure failure.** The API says Spark returns to the stage that generated the missing data, while `DAGScheduler` source shows the usual non-barrier path unregistering the failed map output and resubmitting stages. Reworded the passage to distinguish the public API description from scheduler implementation, describe a successful recovery cycle rather than a single fetch retry, and treat recurrence in one shuffle as evidence of a persistent problem without assuming its layer.
2. **The opening description assumed every `FetchFailedException` followed a concrete block request, and the first-failure evidence list omitted `mapIndex`.** `MetadataFetchFailedException` is a subtype that represents failure to obtain map-output metadata and has no block-manager address. Expanded the description to cover metadata fetches, added `mapIndex`, which identifies the logical map output Spark invalidates, and qualified the address as optional.
3. **The UI instructions used approximate column names and referred ambiguously to executor CPU time.** Replaced them with the current Stage task-table labels—**Status**, **Errors**, **Shuffle Read Size / Records**, **Shuffle Read Fetch Wait Time**, and **Shuffle Remote Reads**—and referred to executor computing time in the task timeline. Also qualified peak execution memory as supporting rather than proving memory pressure.
4. **Storage symptoms and checksum mismatches were categorized too narrowly as direct disk evidence.** Missing files identify a storage-layer problem but can result from cleanup or lifecycle behavior, while Spark uses the checksum file to diagnose detected corruption as potentially disk- or network-related. Reworded the guidance so these observations do not by themselves prove a physical disk fault.
5. **Executor disappearance and external shuffle service checks were presented too broadly.** Qualified executor loss because an external shuffle service or reliable shuffle storage can keep output available after an executor process exits. Scoped the service to supported cluster managers, made the service-name match explicitly YARN-specific, qualified the port check, and made shuffle-service log inspection conditional on a service being enabled.
6. **The event-log command omitted an operational prerequisite.** Added that `spark.eventLog.dir` must be an existing writable directory and, for History Server use, a shared directory matching `spark.history.fs.logDirectory`.
7. **One documentation link label implied a dedicated external-shuffle-service section on the standalone page.** Relabeled the link to accurately describe the general Spark Standalone Mode page.

## Review Notes
- The `/latest` Apache Spark documentation resolved to Spark 4.2.0 during validation.
- The `spark-submit` syntax and all four `--conf` properties are current and non-deprecated. The retry values shown are the documented Spark defaults, and `spark.shuffle.checksum.enabled` is already enabled by default in current Spark; the post correctly presents them as diagnostic examples rather than universal tuning advice.
- `spark.shuffle.checksum.enabled` was introduced in Spark 3.2.0. Shuffle tracking was introduced in Spark 3.0.0, and shuffle-block decommissioning in Spark 3.1.0, so older deployments require version-specific configuration choices.
- Shuffle-block migration requires `spark.decommission.enabled`, `spark.storage.decommission.enabled`, and `spark.storage.decommission.shuffleBlocks.enabled`. A custom reliable `ShuffleDataIO` implementation remains experimental.
- Spark's built-in external shuffle service is supported on standalone and YARN, but not natively on Kubernetes. The post now avoids implying universal support.
