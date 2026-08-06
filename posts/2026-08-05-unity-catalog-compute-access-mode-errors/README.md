# Decode Unity Catalog Compute Access Mode Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Unity Catalog, Compute, Access Modes, Spark, UDFs, Libraries, Troubleshooting

Description: Diagnose RDD, SparkContext, UDF, library, and storage errors by matching workloads to Databricks compute access modes.

---

Many errors that appear during a Unity Catalog migration are actually compute access-mode boundaries. The same notebook can run on dedicated compute and fail on standard compute because the modes expose different Spark APIs, isolate users differently, and authorize files and libraries with different identities.

The useful question is not, "Does Unity Catalog support this code?" It is, "Does this runtime, language, compute product, and access mode support this API under the identity that is executing it?"

This guide starts from the common failures and works backward to that four-part answer.

## Start With the Three Current Compute Choices

Standard compute is Databricks' recommendation for most workloads. It supports multiple users with Lakeguard isolation and Unity Catalog governance, but intentionally blocks lower-level capabilities such as RDD APIs and privileged machine access.

Dedicated compute is assigned to one user or, in public preview, one group. Use it for specialized workloads requiring RDD APIs, GPUs, R, privileged access, or capabilities still missing from standard mode. Dedicated does not mean "supports everything": Unity Catalog Python UDFs, for example, are not supported there.

Serverless notebooks and jobs use Spark Connect APIs and Unity Catalog for data access. They remove cluster management but also omit RDD APIs, Scala and R notebooks, some library sources, continuous and processing-time streaming triggers, and lower-level diagnostics.

The UI's Auto selection normally chooses standard compute. It chooses dedicated when the selected runtime is below 14.3, is a machine learning runtime, or uses a GPU instance. Do not treat Auto as a stable contract for a production job. Declare and test the intended mode in infrastructure configuration.

## Error Class 1: RDD APIs Are Unsupported

Code such as this depends on the RDD API:

```python
counts = (
    spark.sparkContext.textFile(input_path)
    .flatMap(lambda line: line.split())
    .map(lambda word: (word, 1))
    .reduceByKey(lambda left, right: left + right)
)
```

RDD APIs are not supported on standard compute or serverless compute. Moving the job to a newer standard runtime does not change that boundary. Databricks specifically recommends dedicated compute when RDD access is required.

The preferable fix for ordinary transformations is usually a DataFrame rewrite:

```python
from pyspark.sql import functions as F

counts = (
    spark.read.text(input_path)
    .select(F.explode(F.split("value", r"\s+")).alias("word"))
    .where(F.col("word") != "")
    .groupBy("word")
    .count()
)
```

That preserves optimizer visibility, works with Unity Catalog table and volume access, and remains portable across standard and serverless compute. Choose dedicated only when the workload truly needs an RDD-only algorithm or third-party library.

Be careful with a misleading version fact: Python symbols such as `sc`, `spark.sparkContext`, and `sqlContext` are supported on standard compute in Databricks Runtime 14.0 and above, but RDD APIs remain unsupported. Obtaining a `SparkContext` object does not grant permission to call `parallelize`, `textFile`, `wholeTextFiles`, `newAPIHadoopRDD`, or other blocked RDD methods.

## Error Class 2: Scala `sc` and Low-Level Context Access Fail

On current standard compute, Scala code cannot use `sc`, `spark.sparkContext`, or `sqlContext`. Use the provided `spark` session and DataFrame or Dataset APIs:

```scala
val events = spark.table("prod.raw.events")
val valid = events.filter("event_id IS NOT NULL")
```

Scala support itself is runtime-dependent on standard mode:

- Scala requires Databricks Runtime 13.3 LTS or above.
- Scala Dataset operations such as `map`, `mapPartitions`, `flatMap`, and `reduce` require 15.4 LTS or above.
- Spark ML on standard compute requires 17.0 or above.

If upgrading the runtime does not cover the required API, rewrite to supported DataFrame operations or select dedicated compute. Do not attempt to bypass isolation with internal JVM handles or restricted Spark configuration.

Serverless notebooks do not support Scala, although other serverless execution surfaces have their own language and task support. Verify the exact product, not only the word "serverless."

## Error Class 3: A UDF Works on One Mode but Not Another

"UDF" covers several execution models with different matrices.

On standard compute, current support includes:

- Python scalar and Pandas UDFs on 13.3 LTS and above;
- non-scalar Python and Pandas UDFs, UDAFs, UDTFs, `applyInPandas`, and `mapInPandas` on 14.3 LTS and above;
- Scala scalar UDFs on 14.2 and above;
- importing modules from Git folders, workspace files, or volumes in PySpark UDFs on 14.3 LTS and above.

Hive UDFs are not supported on standard compute. Migrate reusable governed logic to a Unity Catalog SQL or Python UDF, or package supported task code appropriately.

The reverse surprise occurs on dedicated compute: Databricks currently does not support Unity Catalog Python UDFs there. Run those functions on standard compute, serverless compute, a serverless or pro SQL warehouse, or Lakeflow pipelines. Switching every failure to dedicated can therefore trade an RDD error for a UDF error.

A practical design is to keep tabular transformations in SQL or DataFrames and reserve UDFs for logic that cannot be expressed with built-in functions. Built-ins avoid serialization boundaries and reduce version-specific behavior.

PySpark UDFs on standard and serverless compute cannot use Spark broadcast variables. Pass small immutable configuration as literals, join governed reference data, or redesign the function rather than closing over driver state.

When a UDF import fails, separately test:

1. whether that UDF type is supported on the runtime and mode;
2. whether the package is installed on both driver and executors;
3. whether the execution identity can read the wheel or module path;
4. whether imported files are serializable and available to the UDF environment;
5. whether network access is allowed from that execution environment.

UDFs in serverless notebooks and jobs cannot access the internet. A function that imports correctly can still fail when it tries to download a model or call an external API.

## Error Class 4: A Library Is Installed but Cannot Be Used

Library failures combine source-location support, allowlisting, file permissions, packaging, and installer identity.

For Databricks Runtime 13.3 LTS and above with Unity Catalog, Databricks recommends installing libraries on standard compute from package repositories or Unity Catalog volumes. JAR paths, Maven coordinates, and init scripts used on standard compute must be added to the Unity Catalog allowlist where required. The allowlist is empty by default and cannot be disabled.

Allowlisting is not a data permission. For a JAR in a volume, both conditions must hold:

- the path is approved for the artifact type in the allowlist;
- the relevant principal has `USE CATALOG` and `USE SCHEMA` on the parent objects and `READ VOLUME` on the volume.

Identity depends on the mode. Standard compute checks a library path as the user who installs the library. Dedicated compute uses its assigned principal. An admin's successful interactive install does not prove that a production job's service principal can install or read the same artifact.

Current library-source differences include:

| Artifact source | Standard | Dedicated | Serverless caveat |
| --- | --- | --- | --- |
| PyPI | Supported on 13.3 LTS+ | Supported | Supported through environment mechanisms |
| Python wheel in a volume | Supported on 13.3 LTS+ | Supported on 13.3 LTS+ | Product-specific environment support |
| JAR in a volume | Supported on 13.3 LTS+, allowlist required | Supported on 13.3 LTS+ | Not supported in notebooks; JAR job tasks are supported |
| JAR in workspace files | Not supported | Not supported | Not a portable choice |
| DBFS root | Not supported on standard | Supported only on 14.3 LTS and below, not recommended | Limited; not a supported library source |
| Maven coordinate | Supported on 13.3 LTS+, allowlist required | Supported | Not supported on serverless notebooks/jobs |

Check the current official library matrix before codifying a source. Databricks has disabled DBFS-root library storage by default in newer runtimes because any workspace user could modify those artifacts.

On standard compute, JAR classes must be in a named package. A class in the default package can produce an import error even after the JAR path and permissions are correct.

## Error Class 5: File Reads Work on Dedicated but Fail on Standard

Standard compute restricts direct file and network access. DBUtils and similar clients can read cloud storage only through a Unity Catalog external location. DBFS root and mounts do not support FUSE there, and POSIX-style DBFS paths are not supported.

Replace path shortcuts with governed objects:

```python
events = spark.table("prod.raw.events")

config = spark.read.text("/Volumes/prod/config/app/settings.json")
```

For cloud data, create a storage credential and external location, then create an external table or volume or grant the appropriate file privilege. Do not attach an instance profile and expect standard compute user code to inherit broad S3 access. Streaming connections and AWS SDK access may require Unity Catalog service credentials instead.

Serverless also requires Unity Catalog for external data and has limited DBFS access. Use tables, volumes, external locations, or workspace files according to the data type.

## Error Class 6: Fine-Grained Controls Behave Differently on Dedicated

Row filters, column masks, dynamic views, and some pipeline-managed objects can require serverless assistance when read from dedicated compute. Current requirements include:

- workspace serverless compute must be enabled;
- reads with fine-grained access control require Databricks Runtime 15.4 LTS or above;
- writes to protected objects require Databricks Runtime 16.3 or above.

On dedicated compute below 15.4, row-filtered or column-masked tables and dynamic views are not available under the modern fine-grained path. A view can also require direct `SELECT` on its dependencies on older runtimes.

This is another reason not to treat dedicated as the universal compatibility mode. If a job needs both an RDD-only library and a masked table, separate the governed extraction from the privileged computation or raise the runtime and satisfy the documented serverless prerequisites.

## Diagnose With a Capability Record

Capture the environment before changing code or privileges:

```python
print(spark.version)
print(spark.conf.get("spark.databricks.clusterUsageTags.dataSecurityMode", "unknown"))
print(spark.sql("SELECT current_user(), current_catalog(), current_schema()")
      .collect())
```

The internal usage-tag configuration is helpful when present but is not a durable application contract. Confirm access mode in the compute configuration or API field `data_security_mode`, and capture the Databricks Runtime version, compute product, language, assigned principal, library source, and failing API.

Then classify the failure:

| Symptom | First check | Typical resolution |
| --- | --- | --- |
| `rdd`, `parallelize`, or `textFile` rejected | Standard or serverless mode | Rewrite with DataFrames or use dedicated |
| Scala cannot access `sc` | Standard mode | Use `spark` and supported APIs |
| Python `sc` exists but RDD call fails | Runtime 14+ standard | Symbol support is not RDD support |
| Unity Catalog Python function fails only on dedicated | Dedicated UDF limitation | Use standard, serverless, SQL warehouse, or pipeline |
| JAR not permitted | Standard allowlist and path grant | Allowlist exact artifact and grant read access |
| Package imports on driver but not in UDF | Runtime/UDF/module distribution | Use supported wheel or module location |
| `/mnt` or direct S3 access fails | Storage governance path | Use table, volume, external location, or service credential |
| Masked table fails only on dedicated | Runtime and serverless prerequisites | Upgrade and enable prerequisites or use standard/serverless |

Do not respond to every authorization-looking message with a broader grant. If the API is unsupported, `ALL PRIVILEGES` will not make it supported and only widens exposure.

## Choose the Mode From Required Capabilities

Use standard compute by default when the workload is SQL, DataFrame-based ETL, collaborative analysis, or supported UDF and library code. It gives multi-user isolation and the broadest Unity Catalog governance path.

Use dedicated compute when the workload genuinely requires RDDs, R, GPUs, machine learning runtime, privileged machine access, or an unsupported standard feature. Assign the narrowest appropriate user or group and verify fine-grained access prerequisites.

Use serverless when automatic compute management, supported DataFrame and SQL APIs, and governed data access fit the task. Verify language, library, streaming-trigger, logging, and networking limitations before migrating a long-running job.

Pin a tested runtime rather than saying "latest." Support thresholds move as Databricks adds capabilities. Re-run the capability tests before runtime or access-mode upgrades, especially for stateful streaming checkpoints.

## Official Documentation

- [Standard compute overview](https://docs.databricks.com/aws/en/compute/standard-overview)
- [Standard compute requirements and limitations](https://docs.databricks.com/aws/en/compute/standard-limitations)
- [Dedicated compute overview](https://docs.databricks.com/aws/en/compute/dedicated-overview)
- [Dedicated compute requirements and limitations](https://docs.databricks.com/aws/en/compute/dedicated-limitations)
- [Serverless compute limitations](https://docs.databricks.com/aws/en/compute/serverless/limitations)
- [Install libraries](https://docs.databricks.com/aws/en/libraries/)
- [Allowlist libraries and init scripts on standard compute](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/allowlist)
- [SQL and Python UDFs in Unity Catalog](https://docs.databricks.com/aws/en/udf/)

## Conclusion

An access-mode error is a capability mismatch until proven otherwise. Record the runtime, language, compute product, mode, identity, and exact API; then compare that tuple with the official support matrix. Prefer DataFrames, governed storage, and standard compute for portable workloads. Choose dedicated or serverless for deliberate requirements, not as blanket escalation paths, because each solves a different set of constraints and introduces its own boundaries.
