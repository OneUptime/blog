# Validation Summary: Upgrade Databricks Runtime 10.x to 15.4 LTS Safely

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Databricks Runtime 10.x, 10.4 LTS, and 15.4 LTS
- Apache Spark 3.2.1 and 3.5.0
- Python 3.8 and 3.11, Python wheels, and requirements files
- Scala 2.12 and Java libraries
- Delta Lake table protocols and table features
- Structured Streaming checkpoints and state stores
- Unity Catalog and compute access modes
- DBFS, workspace files, Unity Catalog volumes, and init scripts
- Photon and Databricks cost/performance measurement

## Sources Consulted

- [Databricks Runtime 10.4 LTS release notes](https://docs.databricks.com/aws/en/release-notes/runtime/10.4lts)
- [Databricks Runtime 10.5 release notes](https://docs.databricks.com/aws/en/release-notes/runtime/10.5)
- [Databricks Runtime 15.4 LTS release notes](https://docs.databricks.com/aws/en/release-notes/runtime/15.4lts)
- [Databricks Runtime versions and compatibility](https://docs.databricks.com/aws/en/release-notes/runtime)
- [Install libraries](https://docs.databricks.com/aws/en/libraries/)
- [Compute-scoped libraries](https://docs.databricks.com/aws/en/libraries/cluster-libraries)
- [Standard compute overview](https://docs.databricks.com/aws/en/compute/standard-overview)
- [Standard compute requirements and limitations](https://docs.databricks.com/aws/en/compute/standard-limitations)
- [Unity Catalog requirements and limitations](https://docs.databricks.com/aws/en/data-governance/unity-catalog/requirements)
- [Structured Streaming checkpoints](https://docs.databricks.com/aws/en/structured-streaming/checkpoints)
- [Delta Lake feature compatibility and protocols](https://docs.databricks.com/aws/en/tables/features/feature-compatibility)
- [Review table details with DESCRIBE DETAIL](https://docs.databricks.com/aws/en/tables/operations/table-details)
- [Apache Spark 3.5.0 release notes and migration guides](https://spark.apache.org/releases/spark-release-3-5-0.html)
- [Python Packaging User Guide: platform compatibility tags](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/)

## Issues Found

- The baseline inventory listed Databricks Runtime 10.0 through 10.4 LTS but omitted 10.5. Added 10.5 because it is also a Runtime 10.x release.
- The support-window comparison named 16.4 LTS and 17.3 LTS but omitted the newer 18 LTS release listed in the current runtime compatibility catalog. Added 18 LTS so the August 2026 guidance reflects the available LTS choices.
- The Scala statement could be read as applying to standard compute generally. Clarified that Scala became generally available in 15.4 LTS on Unity Catalog-enabled standard compute, matching the 15.4 LTS release notes.

## Review Notes

- The runtime version table was verified against the system-environment sections of the 10.4 LTS and 15.4 LTS release notes. The stated Spark, Python, Scala, Java, Ubuntu, and Delta Lake versions are correct.
- The `DESCRIBE DETAIL main.finance.transactions;` example is valid Databricks SQL, and the documented result includes `minReaderVersion`, `minWriterVersion`, and `tableFeatures`.
- The `requirements.txt`, Python egg, and DBFS-root library statements match current Databricks library documentation. Support varies by runtime and access mode as the post notes.
- The 15.4 behavioral-change claims for `spark.sql.legacy.jdbc.useNullCalendar` and Python functions using `VARIANT` are accurate.
- The checkpoint contents, unique-location requirement, and restrictions on restarting after source, sink, or state-schema changes match the Structured Streaming checkpoint documentation.
- Support dates, maintenance images, available LTS releases, and access-mode capabilities are time-sensitive and should be checked again when the post is refreshed.
