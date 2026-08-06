# Upgrade Databricks Runtime 10.x to 15.4 LTS Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Runtime, Version Migration, Apache Spark, Unity Catalog

Description: Upgrade Databricks Runtime 10.x to 15.4 LTS with a compatibility matrix for Python, Scala, Spark, libraries, streaming, Delta Lake, and Unity Catalog.

---

Moving from Databricks Runtime 10.x to 15.4 LTS crosses several platform generations. For a 10.4 LTS baseline, Apache Spark moves from 3.2.1 to 3.5.0, Python from 3.8.10 to 3.11.11, the runtime container from Ubuntu 20.04 to 22.04, and bundled Delta Lake from 1.1.0 to 3.2.0. Scala remains on the 2.12 binary line but moves from 2.12.14 to 2.12.15.

Treat this as an application and data compatibility project, not a cluster setting change.

As of August 2026, Databricks lists 15.4 LTS support through August 19, 2027. Newer LTS releases are available. If 15.4 is not a required intermediate target, compare its remaining support window with 16.4 LTS or 17.3 LTS before investing in the migration.

## Establish the exact baseline

Runtime 10.x is not one environment. Record the full version and variant for every workload:

- 10.0, 10.1, 10.2, 10.3, or 10.4 LTS
- Standard runtime or Machine Learning runtime
- CPU or GPU instance family
- Access mode and Unity Catalog use
- Photon enabled or disabled
- Installed Python, JAR, R, and native libraries
- Init scripts and Spark configuration
- Streaming checkpoint and state store configuration

The comparison below uses 10.4 LTS because it was the LTS release in that family.

| Component | 10.4 LTS | 15.4 LTS | Primary risk |
| --- | --- | --- | --- |
| Apache Spark | 3.2.1 | 3.5.0 | SQL semantics, plans, APIs, streaming behavior |
| Python | 3.8.10 | 3.11.11 | Wheel ABI, package support, language behavior |
| Scala | 2.12.14 | 2.12.15 | Recompile and test Spark-linked JARs |
| Java | Zulu 8 | Zulu 8 | Dependency and TLS behavior, not a major JDK jump |
| Runtime OS | Ubuntu 20.04 | Ubuntu 22.04 | Native libraries, shell tools, package names |
| Delta Lake | 1.1.0 | 3.2.0 | Protocol and table feature compatibility |

Maintenance releases can update bundled packages inside an LTS line. Capture the actual environment from a running cluster and compare it with the current release notes, rather than assuming the first 15.4 image from 2024 is still identical.

## Use a compatibility matrix

Build one row per application or job task. The minimum matrix is:

| Area | Inventory | Required test | Release gate |
| --- | --- | --- | --- |
| Python | Wheels, PyPI pins, native extensions, notebook imports | Clean install on Python 3.11, unit and serialization tests | Reproducible install, no unapproved dependency drift |
| Scala and Java | JARs, Spark APIs, shaded dependencies | Rebuild against target Spark and Scala artifacts, integration test | No binary linkage or classpath conflict |
| Spark SQL | Queries, legacy configs, JDBC reads | Golden results, null and time tests, explain-plan review | Equivalent approved output |
| DataFrame APIs | Python and Scala transformations | Schema, row-count, invariant, and error-path tests | No silent type or nullability drift |
| Delta Lake | Readers, writers, sharing clients, protocol versions | Read and write from every downstream engine | No unintended protocol upgrade |
| Structured Streaming | Sources, sinks, state, checkpoints, triggers | Stop and restart from a non-production checkpoint | State and offsets recover correctly |
| Unity Catalog | Access mode, grants, external locations, UDFs | Run as production identities on target access mode | Least-privilege access succeeds |
| Libraries and init | DBFS paths, eggs, scripts, OS packages | Build cluster from empty state | No dependency on deprecated storage or mutable downloads |
| External systems | JDBC drivers, APIs, TLS, proxies | Read, write, timeout, and retry tests | Supported driver and network path |
| Performance and cost | Runtime, DBUs, spill, shuffle, startup | Representative benchmark | SLO and cost regression within budget |

This matrix should name an owner, evidence location, and rollback trigger for every row.

## Python 3.8 to 3.11

Python is usually the largest application compatibility risk. A package that imports on 3.8 might not publish a compatible 3.11 wheel, and a native extension compiled for `cp38` cannot be reused as a `cp311` artifact.

For each Python task:

1. Export direct dependencies separately from the full resolved environment.
2. Build wheels under Python 3.11 in CI.
3. Install into a clean 15.4 LTS job cluster.
4. Run unit tests without relying on notebook state.
5. Test UDF serialization, Pandas UDFs, Arrow conversions, timezone handling, and exception paths.
6. Compare schemas and values, not only task success.

Do not rely on the runtime's bundled package versions accidentally satisfying application dependencies. Pin packages your application imports directly, while respecting Databricks guidance about overriding runtime components.

Databricks Runtime 15.0 and above supports `requirements.txt` for library management. Python eggs are only supported through 13.3 LTS in limited access modes, so migrate eggs to wheels.

## Scala and Java libraries

Both example runtimes use Scala 2.12, but that does not make a Spark-linked JAR automatically compatible. The Apache Spark API, bundled libraries, internal classes, and transitive dependency versions changed substantially.

For each JAR:

- Rebuild against Spark 3.5 and the target Scala 2.12 artifact line.
- Mark Spark and Databricks-provided dependencies as provided when appropriate.
- Avoid private Spark and Databricks implementation classes.
- Inspect shaded packages and service-loader files for conflicts.
- Test UDF registration, encoders, Dataset operations, serialization, and JDBC connectors.
- Run the same JAR on the intended access mode, not only dedicated development compute.

Starting in 15.4 LTS, Databricks makes all bundled Java and Scala libraries available in Unity Catalog access modes. Scala is generally available on standard compute, with expanded Dataset operations. Standard compute still has limitations, including no RDD APIs. Code that requires RDDs, R, GPUs, distributed ML, or privileged machine access may require dedicated compute.

Do not change runtime and access mode in one unobserved step. Test four combinations when both must change: old runtime and old mode, new runtime and old mode, old runtime and new mode if supported, and new runtime and new mode. This isolates the source of a failure.

## Spark SQL and DataFrame behavior

Spark 3.2 to 3.5 includes optimizer, parser, ANSI, data source, timestamp, JDBC, and error-handling changes. Review the Apache Spark migration guides for each intermediate release and the Databricks behavioral changes for 15.4 LTS.

One documented 15.4 change enables `spark.sql.legacy.jdbc.useNullCalendar` by default. Test JDBC date and timestamp values, especially nulls, historical dates, and timezone boundaries. If the application uses `VARIANT`, 15.4 also rejects `VARIANT` as a Python UDF, UDAF, or UDTF input or output type.

Create golden-data tests that cover:

- Null comparison and cast behavior
- Decimal overflow and rounding
- Timestamp, date, calendar, and timezone boundaries
- Duplicate and ambiguous column names
- Empty input and single-row input
- Join keys with skew and nulls
- JSON, CSV, Parquet, and JDBC parsing options
- UDF and Pandas UDF schemas
- Error classes expected by retry logic

Compare output schema, nullability, row count, business invariants, and deterministic aggregates. A successful job with a changed result is a failed migration.

Review `EXPLAIN FORMATTED` for critical queries. A new plan can be correct but produce a cost or latency regression because join strategy, shuffle count, or pruning changed.

## Library and file location changes

Library storage that worked on 10.x may be blocked or deprecated on 15.4:

- DBFS root is deprecated.
- Library files in DBFS root are disabled by default on Databricks Runtime 15.1 and above.
- Python egg installation is no longer supported on 15.4.
- Supported alternatives include workspace files, Unity Catalog volumes, cloud object storage, PyPI, Maven, and wheel files, depending on access mode.

Inventory every `dbfs:/FileStore`, `/dbfs`, `/databricks/init`, mount, and global init script reference. Move libraries and configuration to a supported governed location. Move data access to Unity Catalog external locations or volumes rather than preserving a mount solely for compatibility.

Build target clusters from an empty state. A test that succeeds only because an old cluster cached a wheel or runtime artifact is not reproducible.

## Delta Lake protocol safety

The runtime bundles a much newer Delta Lake version, but reading a table with a new runtime is not permission to enable every new table feature.

Inventory protocol and feature state:

```sql
DESCRIBE DETAIL main.finance.transactions;
```

Record `minReaderVersion`, `minWriterVersion`, and table features for critical tables. Identify every reader and writer outside the upgraded job, including older Databricks runtimes, Delta Sharing recipients, streaming jobs, and external engines.

Keep protocol upgrades out of the runtime migration unless a feature is required and separately approved. Some table features raise minimum reader or writer requirements and can block rollback to older clients. Databricks advises against manually setting protocol properties as a casual compatibility fix.

For write validation, compare transaction history, schema evolution, merge behavior, generated files, concurrency, and downstream reads. Use cloned or isolated test tables so the candidate runtime cannot upgrade a production table accidentally.

## Structured Streaming checkpoints

A checkpoint stores offsets, commits, query identity, configuration, and state. Each query must have a unique checkpoint location, and two active queries must never share one.

For every stream:

1. Inventory source count and order, sink type, trigger, stateful operators, state schema, and checkpoint location.
2. Stop a non-production copy cleanly.
3. Start the unchanged query on 15.4 from its existing test checkpoint.
4. Verify recovered offsets, state, watermark behavior, output uniqueness, and progress metrics.
5. Test a controlled failure and restart.
6. Prove the rollback procedure before production cutover.

Changes to source count or type, stateful operation, state schema, or sink can require a new checkpoint. Do not combine those code changes with the runtime upgrade. If a new checkpoint is required, document replay boundaries and sink idempotency.

For production cutover, stop the old query and wait for a committed batch before starting the new runtime. Never run the old and new query concurrently against the same checkpoint. Preserve a recovery copy according to storage policy, and understand that a checkpoint written by the newer runtime might not be safely reusable by the older runtime.

## Unity Catalog and access modes

Runtime 15.4 unlocks more Unity Catalog functionality than 10.x, but the access mode still defines available APIs.

Validate:

- Catalog, schema, table, volume, external location, and credential grants
- Run-as user or service principal behavior
- Dynamic views, row filters, and column masks used by the workload
- Python and Scala UDF support on the chosen mode
- RDD, SparkContext, R, GPU, and machine learning requirements
- Direct cloud paths and legacy credential passthrough

Databricks recommends standard compute for most workloads and dedicated compute for specialized requirements such as RDD APIs, R, GPUs, or distributed ML. Unity Catalog requires a compatible access mode. Legacy credential passthrough is not compatible with Unity Catalog.

Run authorization tests as the production identity. A workspace admin's successful notebook does not prove that a job service principal has the required grants.

## Performance and cost regression

Keep hardware, worker bounds, Photon setting, data snapshot, and concurrency fixed for the first runtime comparison. Otherwise, a faster result cannot be attributed to the runtime.

Measure:

- Cluster setup and library installation time
- End-to-end and per-stage runtime
- CPU, memory, spill, shuffle, failed tasks, and skew
- Files and bytes read and written
- DBUs and provider infrastructure cost
- Output file count and size
- Success, retry, and repair rates

After correctness passes, test Photon or a new node family as separate experiments. Photon-enabled compute can use DBUs at a different rate, so compare cost per successful outcome rather than runtime alone.

Set explicit gates, for example:

```text
correctness: all critical invariants equal
reliability: no increase in failed or retried runs
latency: P95 no more than the approved regression budget
cost: cost per successful partition within the approved budget
```

Use measured service objectives from the application. The values above are categories, not universal thresholds.

## Rollout and rollback

Use progressive exposure:

1. Run unit and library-install tests in CI.
2. Run integration tests on isolated tables and checkpoints.
3. Shadow representative production inputs without publishing side effects.
4. Canary low-risk jobs or partitions.
5. Expand by workload group while monitoring correctness, runtime, and cost.
6. Retire 10.x configurations only after the rollback window closes.

Keep the old job definition and dependencies immutable during the rollback window. Rollback triggers should be observable and specific: schema mismatch, invariant failure, checkpoint recovery error, repeated library failure, or a measured SLO regression.

Do not promise rollback after enabling an incompatible Delta table feature or writing checkpoint state that the old runtime cannot read. Those changes require a forward-fix or a separately tested recovery path.

## Official Documentation

- [Databricks Runtime 10.4 LTS release notes](https://docs.databricks.com/aws/en/release-notes/runtime/10.4lts)
- [Databricks Runtime 15.4 LTS release notes](https://docs.databricks.com/aws/en/release-notes/runtime/15.4lts)
- [Runtime versions and support dates](https://docs.databricks.com/aws/en/release-notes/runtime)
- [Install libraries](https://docs.databricks.com/aws/en/libraries/)
- [Standard compute overview](https://docs.databricks.com/aws/en/compute/standard-overview)
- [Unity Catalog requirements and limitations](https://docs.databricks.com/aws/en/data-governance/unity-catalog/requirements)
- [Structured Streaming checkpoints](https://docs.databricks.com/aws/en/structured-streaming/checkpoints)
- [Apache Spark 3.5.0 release and migration links](https://spark.apache.org/releases/spark-release-3-5-0.html)

## Conclusion

An upgrade from Databricks Runtime 10.x to 15.4 LTS changes Python, Spark, Delta Lake, the operating system, library storage expectations, and Unity Catalog capability. Inventory the exact baseline, test every compatibility dimension on the intended access mode, isolate table and checkpoint changes, and gate rollout on correctness, reliability, latency, and full cost. Also confirm that 15.4's remaining support window is appropriate before choosing it over a newer LTS target.
