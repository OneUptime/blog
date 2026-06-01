# Validation Summary: How to Create an Apache Spark Cluster in Azure HDInsight

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure HDInsight
- Apache Spark
- Azure CLI
- Azure Storage
- Azure Data Lake Storage Gen2
- Jupyter Notebook
- Apache Zeppelin
- Apache Ambari
- Azure Virtual Network
- Azure Private Link

## Sources Consulted
- Microsoft Learn: Azure HDInsight component retirements and action required: https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-component-retirements-and-action-required
- Microsoft Learn: Azure HDInsight versions and supported Spark versions: https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-component-versioning
- Microsoft Learn: HDInsight 5.x component versions: https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-5x-component-versioning
- Microsoft Learn: Azure CLI `az hdinsight create`: https://learn.microsoft.com/en-us/cli/azure/hdinsight
- Microsoft Learn: Azure CLI `az hdinsight autoscale create`: https://learn.microsoft.com/en-us/cli/azure/hdinsight/autoscale
- Microsoft Learn: Configure Apache Spark settings in Azure HDInsight: https://learn.microsoft.com/en-us/azure/hdinsight/spark/apache-spark-settings
- Microsoft Learn: Jupyter Notebook kernels on HDInsight Spark clusters: https://learn.microsoft.com/en-us/azure/hdinsight/spark/apache-spark-jupyter-notebook-kernels
- Microsoft Learn: Use an interactive Spark shell in Azure HDInsight: https://learn.microsoft.com/en-us/azure/hdinsight/spark/apache-spark-shell
- Microsoft Learn: Azure HDInsight virtual network architecture: https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-virtual-network-architecture
- Microsoft Learn: Restrict public connectivity in Azure HDInsight: https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-restrict-public-connectivity
- Microsoft Learn: Enable Private Link on an HDInsight cluster: https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-private-link
- Microsoft Q&A: Azure HDInsight Spot instances: https://learn.microsoft.com/en-us/answers/questions/1365838/azure-hd-insights-spot-instances

## Issues Found
- Updated the recommended Spark version from Spark 3.1 to Spark 3.3 on HDInsight 5.1. HDInsight 5.0 and its Spark 3.1 line are retired as of March 31, 2025, while HDInsight 5.1 is the current supported version.
- Replaced D12/D13 v2-oriented sizing guidance and CLI examples with supported current sizing guidance and `Standard_E8_v3` examples. Microsoft documents Dv2-series unavailability in HDInsight as of March 31, 2026.
- Fixed invalid Azure CLI storage flags by replacing `--storage-default-container` with `--storage-container` and `--storage-default-filesystem` with `--storage-filesystem`.
- Fixed the ADLS Gen2 managed identity option by replacing `--assign-identity` with `--storage-account-managed-identity` for the storage account identity configuration shown in the CLI example.
- Updated the Jupyter kernel references from PySpark to PySpark3 for current Spark clusters.
- Changed the sample Spark input path from a Blob-specific `wasbs://` URL to the default-filesystem path `/example/data/gutenberg/davinci.txt`, so the example is not tied to Azure Storage when the cluster uses ADLS Gen2.
- Changed the Ambari navigation from `Spark2 > Configs` to `Spark (or Spark2) > Configs` to match version-dependent service naming.
- Replaced the spot instance cost tip because HDInsight cluster VMs do not expose Azure Spot VM configuration.
- Corrected the VNet security explanation. A VNet deployment enables private connectivity to VNet resources, but public HTTPS and SSH endpoints can still exist unless restricted connectivity and Private Link controls are configured.

## Review Notes
- The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference documentation rather than local `az --help` output.
- The sample word count path uses HDInsight's documented `/example/data/gutenberg/davinci.txt` sample data path.
