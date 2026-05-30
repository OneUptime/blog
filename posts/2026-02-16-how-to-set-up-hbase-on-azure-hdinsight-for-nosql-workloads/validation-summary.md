# Validation Summary: How to Set Up HBase on Azure HDInsight for NoSQL Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache HBase
- Azure HDInsight
- Azure CLI
- HBase Shell
- HBase REST API
- Java HBase client
- HBase table design and performance tuning

## Sources Consulted
- Microsoft Learn: Azure CLI `az hdinsight create` and `az hdinsight resize` reference: https://learn.microsoft.com/en-us/cli/azure/hdinsight
- Microsoft Learn: Azure HDInsight component retirements and supported versions: https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-component-retirements-and-action-required
- Microsoft Learn: HDInsight 5.x component versions: https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-5x-component-versioning
- Microsoft Learn: Tutorial - Use Apache HBase in Azure HDInsight: https://learn.microsoft.com/en-us/azure/hdinsight/hbase/apache-hbase-tutorial-get-started-linux
- Apache HBase Reference Guide and configuration docs: https://hbase.apache.org/book.html and https://hbase.apache.org/docs/configuration/default/
- Apache HBase 2.4 Java API documentation for `Scan`: https://hbase.apache.org/2.4/apidocs/org/apache/hadoop/hbase/client/Scan.html

## Issues Found
- The Azure CLI provisioning example used `--storage-default-container`, which is not a current `az hdinsight create` option. Changed it to `--storage-container`.
- The provisioning example used `Standard_D13_V2`, but Microsoft lists Dv2-series VM unavailability in Azure HDInsight after March 31, 2026. Updated the example to `Standard_E8ads_v5`, one of the newer VM families Microsoft recommends migrating to.
- The provisioning example selected HBase 2.4 without explicitly selecting the supported HDInsight 5.1 line. Added `--version 5.1`, which maps to Apache HBase 2.4.11 in current Microsoft documentation.
- The REST API example showed manually starting `hbase rest` on port 8080 and using an internal worker-node HTTP URL with scanner calls. Microsoft documents HDInsight HBase REST access through the HTTPS cluster gateway after enabling the REST proxy with a Script Action, and notes that scanning through the cluster endpoint is not supported. Replaced the example with the documented REST proxy enablement pattern and supported list/get curl calls.
- The Java client example used `Configuration` without importing `org.apache.hadoop.conf.Configuration`. Added the missing import so the snippet compiles when the HBase/Hadoop dependencies are present.
- The major compaction example set `hbase.hregion.majorcompaction` under a column-family descriptor. Updated it to table-level `CONFIGURATION`, matching HBase shell configuration usage for table-scoped settings.

## Review Notes
- The local environment did not have Azure CLI installed, so CLI validation was done against the official Microsoft Learn command reference rather than local `az --help`.
- The HBase shell CRUD, table creation, TTL, Bloom filter, pre-split, row-prefix scan, balancer, and memory tuning examples are consistent with HBase documentation for the discussed HBase 2.x behavior.
