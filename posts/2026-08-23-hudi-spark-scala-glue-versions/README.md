# Match Hudi, Spark, Scala, and AWS Glue Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Apache Spark, Scala, AWS Glue, Dependency Management

Description: Select compatible Hudi bundles for Spark and AWS Glue runtimes and diagnose class-loading failures caused by mixed versions.

---

Hudi's Spark bundle is compiled for a specific Spark line and Scala binary version. A JAR can download successfully and still fail at runtime when Spark, Scala, Java, Hudi modules, or an AWS-managed runtime do not match.

Typical symptoms include `ClassNotFoundException`, `NoSuchMethodError`, `AbstractMethodError`, Scala signature errors, Kryo registration failures, and linkage errors inside Avro or Parquet. The fix is to select one compatible dependency set, not to add more random JARs until the class appears.

This guide uses the current Apache Hudi 1.2.x and AWS Glue documentation available in August 2026.

## Start with the Hudi support matrix

Hudi 1.2.x supports:

| Spark | Hudi bundle suffix | Scala | Java |
| --- | --- | --- | --- |
| 4.1 | `hudi-spark4.1-bundle_2.13` | 2.13 | 17+ |
| 4.0 | `hudi-spark4.0-bundle_2.13` | 2.13 | 17+ |
| 3.5 | `hudi-spark3.5-bundle_2.12` or `_2.13` | 2.12 or 2.13 | 8+ |
| 3.4 | `hudi-spark3.4-bundle_2.12` | 2.12 | 8+ |
| 3.3 | `hudi-spark3.3-bundle_2.12` | 2.12 | 8+ |

The Scala suffix is binary compatibility, not cosmetic naming. Spark built for Scala 2.12 cannot load a Hudi `_2.13` bundle.

For Spark 3.5 with Scala 2.12:

```bash
spark-submit \
  --packages org.apache.hudi:hudi-spark3.5-bundle_2.12:1.2.0 \
  --conf spark.serializer=org.apache.spark.serializer.KryoSerializer \
  --conf spark.sql.catalog.spark_catalog=org.apache.spark.sql.hudi.catalog.HoodieCatalog \
  --conf spark.sql.extensions=org.apache.spark.sql.hudi.HoodieSparkSessionExtension \
  app.py
```

Use the full versioned bundle that matches `spark-submit --version` output. Do not use the generic `hudi-spark3-bundle` unless the release documentation explicitly matches your runtime.

## Know the AWS Glue built-in matrix

Current AWS documentation lists:

| AWS Glue | Spark | Scala | Built-in Hudi |
| --- | --- | --- | --- |
| 6.0 | 4.1.1 | 2.13.17 | 1.1.1 |
| 5.1 | 3.5.6 | 2.12.18 | 1.0.2 |
| 5.0 | 3.5.4 | 2.12.18 | 0.15.0 |
| 4.0 | 3.3.0 | 2.12 line | 0.12.1 |
| 3.0 | 3.1.1 | 2.12 line | 0.10.1 |

Glue 6.0 uses Java 17 and updates its built-in open-table-format integration to Hudi 1.1.1. AWS currently identifies Glue 5.1 as the default for jobs that omit an explicit Glue version, so select 6.0 deliberately when its runtime is required. AWS notes that Glue 3.0's Hudi 0.10.1 does not support Merge-on-Read tables. Glue 5.0's Hudi 0.15.0 also carries an AWS-specific revert for HUDI-7001, so it is not behaviorally identical to the upstream artifact in that key-generation case.

If the built-in Hudi version has the needed features, enable it with:

```text
--datalake-formats hudi
```

and set the documented Kryo serializer. Do not also attach a second Hudi Spark bundle.

## Override Glue Hudi as one complete stack

AWS supports custom Hudi JARs:

1. Pass the custom JARs through `--extra-jars`.
2. Do not include `hudi` in `--datalake-formats`.
3. On Glue 5.0 or later, set `--user-jars-first true`.

The corresponding upstream Hudi 1.2 Spark artifacts are:

| AWS Glue | Upstream Hudi 1.2 Spark artifact |
| --- | --- |
| 6.0 | `org.apache.hudi:hudi-spark4.1-bundle_2.13:1.2.0` |
| 5.1 | `org.apache.hudi:hudi-spark3.5-bundle_2.12:1.2.0` |

Those coordinates match the public Spark and Scala matrix, but a production override still needs AWS integration tests for Glue APIs, Lake Formation, S3, Glue Catalog sync, serializers, and job packaging. Glue 6.0 also removes AWS SDK for Java v1 and EMRFS, so test any companion integrations against its AWS SDK v2 and S3A runtime. Include only matching Hudi companion bundles required by the job, such as the AWS or utilities bundle from the same Hudi release.

Never mix `hudi-common` 1.2.0 with a Spark bundle 1.0.2 or an AWS bundle 0.15.0. Bundles intentionally package coordinated transitive dependencies.

## Diagnose failures from the classpath

Capture runtime versions:

```python
print("Spark:", spark.version)
print("Scala:", spark.sparkContext._jvm.scala.util.Properties.versionNumberString())
print("Java:", spark.sparkContext._jvm.java.lang.System.getProperty("java.version"))
```

Then inspect loaded JARs and dependency arguments. Look for multiple files containing:

```text
hudi-
scala-library
spark-sql
avro
parquet
jackson
```

Interpret common failures:

- `ClassNotFoundException`: required bundle absent, wrong artifact, or provider module not packaged.
- `NoSuchMethodError`: class exists but a different version was loaded.
- `AbstractMethodError`: interface and implementation came from incompatible Spark or Hudi builds.
- `NoClassDefFoundError: scala/...`: Scala binary mismatch is likely.
- Kryo registration error: Hudi extension or registrator class is missing or from the wrong bundle.

The first `Caused by` linkage error is usually more useful than the final Spark stage failure.

## Check table version separately

Library compatibility and table compatibility are related but distinct. Current Hudi CLI documentation maps:

| Hudi release | Table version |
| --- | --- |
| 1.1.x-1.2.x | 9 |
| 1.0.x | 8 |
| 0.14.x-0.15.x | 6 |
| 0.12.x-0.13.x | 5 |

A newer writer can upgrade table format state. Older readers may then be unable to read it even if their JARs load. Hudi recommends upgrading readers before writers when table versions evolve.

Check:

```text
.hoodie/hoodie.properties
hoodie.table.version=...
```

Do not manually edit it. Use the supported writer upgrade path or Hudi CLI upgrade/downgrade operations.

## Build a compatibility test

Before deploying a new bundle or Glue runtime:

1. Create a table with the production key, partition, and schema settings.
2. Insert, upsert, and delete.
3. Read snapshot and incremental results.
4. For MOR, write logs and run compaction.
5. Run clustering and cleaning.
6. Sync to Glue and query from every required engine.
7. Restart the job to catch serialization and checkpoint incompatibilities.
8. Test an existing production table clone, not only a new table.

Pin every version in infrastructure code. Record the Glue runtime, Spark, Scala, Java, Hudi artifacts, and table version in deployment metadata.

## Avoid dependency anti-patterns

Do not copy all JARs from another cluster. Do not depend on Maven's newest transitive version for Spark internals. Do not combine `--packages` and `--extra-jars` for overlapping Hudi artifacts. Do not shade Spark or Scala into an application JAR.

When AWS upgrades a managed runtime, treat it as a platform migration. The same Python script can execute against a different Spark, Java, Hudi, and dependency graph.

## Official Documentation

- [Apache Hudi Spark quick start and support matrix](https://hudi.apache.org/quickstart/)
- [Apache Hudi downloads and bundle names](https://hudi.apache.org/releases/download/)
- [Apache Hudi 1.2 release notes](https://hudi.apache.org/releases/release-1.2/)
- [AWS Glue Hudi framework and version matrix](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format-hudi.html)
- [AWS Glue runtime versions](https://docs.aws.amazon.com/glue/latest/dg/release-notes.html)
- [Apache Hudi CLI table-version mapping](https://hudi.apache.org/docs/cli/)

## Conclusion

Match the Spark line, Scala binary suffix, Java runtime, Hudi release, companion bundles, and Hudi table version as one tested set. On Glue, choose either the built-in integration or a complete custom stack, never both. Diagnose linkage errors by identifying the duplicate or mismatched JAR rather than adding another dependency.
