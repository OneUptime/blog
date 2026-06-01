# Validation Summary: How to Run Hive Queries on Azure HDInsight for Data Warehousing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure HDInsight
- Apache Hive
- Apache Hadoop
- Apache Tez
- Apache ORC
- Azure Blob Storage / WASB
- Azure CLI
- Apache Beeline / HiveServer2 JDBC
- Apache Ambari
- WebHCat / Templeton REST API
- Azure Data Factory

## Sources Consulted
- Microsoft Learn: Azure CLI `az hdinsight create` reference - https://learn.microsoft.com/en-us/cli/azure/hdinsight?view=azure-cli-latest
- Microsoft Learn: Azure HDInsight supported versions - https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-component-versioning
- Microsoft Learn: HDInsight 5.x component versions - https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-5x-component-versioning
- Microsoft Learn: Azure HDInsight component retirements and action required - https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-component-retirements-and-action-required
- Microsoft Learn: Default and recommended node configurations for Azure HDInsight - https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-supported-node-configuration
- Microsoft Learn: Connect to HiveServer2 using Beeline - https://learn.microsoft.com/en-us/azure/hdinsight/hadoop/connect-install-beeline
- Microsoft Learn: Use Apache Ambari Hive View with HDInsight - https://learn.microsoft.com/en-us/azure/hdinsight/hadoop/apache-hadoop-use-hive-ambari-view
- Microsoft Learn: HDInsight Interactive Query LLAP sizing guide - https://learn.microsoft.com/en-us/azure/hdinsight/interactive-query/hive-llap-sizing-guide
- Microsoft Learn: Use Apache Hadoop Hive with Curl in HDInsight - https://learn.microsoft.com/en-us/azure/hdinsight/hadoop/apache-hadoop-use-hive-curl
- Microsoft Learn: Azure Data Factory pipelines and activities - https://learn.microsoft.com/en-us/azure/data-factory/concepts-pipelines-activities
- Apache Hive documentation: ORC language manual - https://hive.apache.org/docs/latest/language/languagemanual-orc/
- Apache Hive documentation: WebHCat manual - https://hive.apache.org/docs/latest/webhcat/

## Issues Found
- Corrected the LLAP expansion from "Live Long and Process" to "Low Latency Analytical Processing," matching Azure HDInsight Interactive Query documentation.
- Updated the `az hdinsight create` example to specify supported HDInsight version `5.1` and Hadoop component version `3.3.4`, matching the current HDInsight 5.1 component table.
- Replaced the retired/unavailable Dv2-series worker size in the sample command with `Standard_E8_v3`, which is listed as a default Hadoop worker node size in HDInsight node configuration documentation.
- Replaced the incorrect Azure CLI option `--storage-default-container` with the current `--storage-container` option.
- Added a comment to the top-products query clarifying that `dim_products` must already exist, because the post only creates the fact and raw order tables.
- Added `statusdir` to the WebHCat/Templeton REST API example to align with Microsoft Learn's HDInsight Hive REST examples.

## Review Notes
The Hive DDL, dynamic partitioning settings, ORC compression property, Beeline public endpoint, partition-pruning examples, Tez setting, vectorized execution settings, and Azure Data Factory HDInsight Hive activity references are consistent with official documentation. HDInsight 5.0 and 4.0 are retired as of March 31, 2025, so new examples should continue to pin HDInsight 5.1 unless Microsoft publishes a newer supported HDInsight version.
