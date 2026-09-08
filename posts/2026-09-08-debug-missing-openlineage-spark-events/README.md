# How to Debug Missing OpenLineage Events from Spark Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenLineage, Apache Spark, Data Lineage, Observability, Data Engineering

Description: Isolate Spark listener, classpath, transport, backend, and logical-plan failures with a small repeatable OpenLineage canary.

---

A Spark job can finish successfully while emitting no OpenLineage event. The data path and the metadata path are separate: Spark may read and write correctly even when the listener never loaded, the driver cannot reach the transport, or the backend rejects the payload.

Debug the path in order:

```text
Spark application
  -> OpenLineage SparkListener
  -> event construction
  -> configured transport
  -> receiver
  -> catalog indexing and display
```

Testing one boundary at a time is faster than changing the JAR, network, and catalog configuration together.

## Classify the symptom first

There are four different failures that are often reported as “missing events”:

1. No OpenLineage log messages and no events.
2. Events are constructed locally but never arrive at the receiver.
3. The receiver accepts events but the catalog does not display them.
4. Run events exist, but inputs, outputs, or column lineage are missing.

Capture the Spark application ID, driver location, deployment mode, Spark and Scala versions, OpenLineage artifact version, job namespace, transport type, and expected dataset names before making changes.

## Prove that the listener is registered

The OpenLineage Spark integration uses Spark's listener mechanism. Spark documents `spark.extraListeners` as a comma-separated list of `SparkListener` implementations instantiated when `SparkContext` starts. The required OpenLineage class is:

```text
io.openlineage.spark.agent.OpenLineageSparkListener
```

A minimal submission is:

```bash
spark-submit \
  --packages "io.openlineage:openlineage-spark_2.12:<OPENLINEAGE_VERSION>" \
  --conf "spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener" \
  --conf "spark.openlineage.namespace=production" \
  --conf "spark.openlineage.transport.type=console" \
  lineage_canary.py
```

Replace `2.12` and the version with coordinates compatible with the deployed Spark and Scala runtime. Current OpenLineage installation documentation publishes separate artifacts using the Scala binary suffix. Verify the downloaded JAR and inspect the driver's dependency-resolution output.

Common listener failures include:

- the package was added to executors but not the driver classpath
- the Scala binary suffix does not match the runtime
- a dependency exclusion or shaded application removed required classes
- cluster policy overwrote `spark.extraListeners`
- another listener value replaced rather than extended the comma-separated list
- the Spark context existed before application code tried to set startup configuration

Print or log the effective Spark configuration from the running driver. Spark can log the effective `SparkConf` at INFO when `spark.logConf=true`. Do not rely only on the submit command shown by the orchestrator.

On a platform that already supplies listeners, preserve the required platform listeners. The OpenLineage usage guide gives Databricks as a specific case where its event-logging listener must remain alongside the OpenLineage listener.

## Switch to the console transport

The console transport isolates listener and event construction from HTTP, Kafka, credentials, DNS, and the receiving catalog:

```text
spark.openlineage.transport.type=console
```

The Java client transport documentation says that events are serialized as JSON and logged at INFO under the `ConsoleTransport` logger. Look in driver logs, not executor logs.

Run a canary that performs an actual action and writes a supported sink. Save this as `lineage_canary.py`. Replace the example bucket with a writable test bucket, and ensure the driver and executors have compatible Hadoop S3A dependencies, credentials, and network access:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("lineage-canary").getOrCreate()

source = spark.createDataFrame([(1, 10), (2, 20)], ["id", "amount"])
source.createOrReplaceTempView("source_orders")

result = spark.sql("""
    SELECT id, amount * 2 AS doubled_amount
    FROM source_orders
""")
result.write.mode("overwrite").parquet("s3a://lineage-canary/output/run-1")
spark.stop()
```

Creating a lazy DataFrame without an action produces no completed query to observe. A console event proves that the listener and builder ran. It does not prove that a remote receiver is reachable.

Also check that the integration was not explicitly disabled:

```text
spark.openlineage.disabled=false
```

The equivalent environment configuration can disable it too. Inspect both sources and cluster-injected settings.

## Separate construction from delivery

After console emission works, configure the intended transport. For HTTP, verify the exact base URL, endpoint behavior, authentication headers or token, TLS trust, proxy, and timeout. Test connectivity from the Spark driver environment. A successful request from a laptop says nothing about a driver running in a private Kubernetes pod or YARN container.

Record transport-side counters:

```text
events attempted
events serialized
events sent
responses by status code
retries
events abandoned
queue depth
```

Do not make lineage delivery fatal to production data processing unless that is an explicit policy. Conversely, a nonfatal client must expose delivery failure clearly or silent loss becomes normal.

For Kafka transport, inspect producer acknowledgements and the target topic from the driver's network and identity. For asynchronous transports, allow a graceful application shutdown long enough to flush queued events.

## Inspect driver logs for the first real error

Search the complete driver log around Spark context initialization and query completion. Useful categories are:

- `ClassNotFoundException` or `NoClassDefFoundError`: artifact or dependency problem
- listener construction failure: invalid configuration or incompatible class
- serialization or schema failure: event-building problem
- TLS, DNS, connection, 401, 403, 404, 413, 429, or 5xx errors: transport or receiver problem
- timeout or circuit-breaker messages: lineage work exceeded its configured budget

Spark uses Log4j 2 and supports a `log4j2.properties` configuration. Temporarily raise logging for OpenLineage packages in a controlled environment, then restore a reasonable level. Avoid broad DEBUG logging for long production jobs because it can create a large, sensitive log stream.

## When events arrive but datasets are missing

An event with an empty input or output list is a different problem from no event. Inspect the analyzed logical plan and connector support.

Likely causes include:

- a custom Spark data source has no extractor
- a vendor extension introduces an unknown logical-plan node
- an RDD-only path was filtered or RDD event emission was disabled
- a path-trimming expression collapsed distinct dataset names
- the write never executed because Spark evaluation stayed lazy
- an in-memory or temporary source has no physical external dataset
- a facet or node class was explicitly denied by configuration

OpenLineage provides built-in extension interfaces so Spark extensions can expose their lineage metadata. Until an extension supports those interfaces, retain an unresolved boundary instead of inventing an input.

Column-level lineage is enabled by default in the documented Spark integration, but a facet can still be disabled through `spark.openlineage.facets.<facet-name>.disabled`. Check the effective configuration if table lineage exists but column mappings do not.

## Enable the debug facet only for diagnosis

The Spark integration's debug facet is disabled by default. Enable it temporarily:

```text
spark.openlineage.facets.debug.disabled=false
```

It can include classpath, Spark and OpenLineage versions, deployment mode, Java and operating-system data, shortened logical-plan information, integration metrics, memory information, and relevant logs. This is valuable when an event is emitted but its content is incomplete.

For intermittent missing inputs or outputs, current documentation also describes smart debugging:

```text
spark.openlineage.debug.smart=true
spark.openlineage.debug.smartMode=any-missing
```

Smart debugging emits the debug facet only on `COMPLETE` events that meet the selected criteria. Use `output-missing` if only absent outputs should trigger it. The debug facet can increase payload size and expose operational details, so do not leave it broadly enabled without reviewing retention and access.

## Verify the receiver independently

Capture one complete console JSON event and submit a sanitized equivalent through a receiver test client. Check:

- HTTP response or broker acknowledgement
- receiver ingestion logs
- schema-version support
- event deduplication keys
- namespace and job name used for lookup
- time filters and environment filters in the UI
- backend processing lag

OpenLineage identifies a job by namespace and name, and each run by its run ID. An event may be present under an unexpected namespace rather than absent. Search by run ID before changing naming configuration.

Avoid replaying a production event with the same run ID unless the backend's idempotency behavior is understood. Generate a dedicated canary identity.

## Account for lifecycle behavior

Batch jobs normally emit `START` followed by a terminal `COMPLETE`, `FAIL`, or `ABORT`. A force-killed driver may never get the opportunity to emit its terminal event. That is not equivalent to a transport losing a successfully attempted terminal event.

Streaming jobs can run indefinitely. Do not wait for `COMPLETE` to decide whether lineage is healthy. The OpenLineage Job Type facet defines `STREAMING` separately and supports periodic `RUNNING` events. Monitor event age and checkpoint or progress evidence appropriate to the integration.

## Build a permanent canary

Run a small scheduled job after cluster-image, Spark, Scala, connector, or OpenLineage upgrades. It should:

1. Read one known external dataset.
2. Apply a rename and arithmetic expression.
3. Write one known external dataset.
4. Finish successfully.
5. Assert `START` and `COMPLETE`, input and output identities, and one column mapping at the receiver.

Alert separately on listener absence, delivery failure, receiver rejection, indexing delay, and missing datasets. Those states have different owners and fixes.

## Conclusion

Debug missing Spark lineage from the inside out. Prove the listener is on the driver's compatible classpath, emit to the console, verify remote delivery from the driver environment, and only then investigate catalog display. When events exist but fields are incomplete, inspect connector and logical-plan coverage with a temporary debug facet and a permanent canary.

## Official Documentation

- [OpenLineage Spark installation](https://openlineage.io/docs/integrations/spark/installation/)
- [OpenLineage Spark configuration usage](https://openlineage.io/docs/integrations/spark/configuration/usage/)
- [OpenLineage Spark configuration parameters](https://openlineage.io/docs/integrations/spark/configuration/spark_conf/)
- [OpenLineage transport configuration](https://openlineage.io/docs/integrations/spark/configuration/transport/)
- [OpenLineage Spark debug facet](https://openlineage.io/docs/integrations/spark/debug_facet/)
- [OpenLineage Spark column-level lineage](https://openlineage.io/docs/integrations/spark/spark_column_lineage/)
- [OpenLineage Spark extension integration](https://openlineage.io/docs/integrations/spark/developing/built_in_lineage/)
- [Apache Spark configuration](https://spark.apache.org/docs/latest/configuration.html)
