# Validation Summary: How to Set Up a High-Availability Dataproc Cluster with Multiple Masters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataproc / Managed Service for Apache Spark clusters
- Hadoop High Availability
- HDFS NameNode, JournalNode, and DataNode replication
- YARN ResourceManager high availability
- ZooKeeper quorum and failover coordination
- Spark on YARN
- Hive Metastore and Dataproc Metastore
- Google Cloud CLI

## Sources Consulted
- Google Cloud Dataproc High Availability Mode: https://docs.cloud.google.com/dataproc/docs/concepts/configuring-clusters/high-availability
- Google Cloud Dataproc services: https://cloud.google.com/dataproc/docs/concepts/services
- Google Cloud SDK `gcloud dataproc clusters create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Google Cloud Dataproc cluster properties: https://docs.cloud.google.com/dataproc/docs/concepts/configuring-clusters/cluster-properties
- Google Cloud Dataproc Metastore attach cluster guide: https://docs.cloud.google.com/dataproc-metastore/docs/attach-dataproc
- Google Cloud Dataproc versioning overview: https://docs.cloud.google.com/dataproc/docs/concepts/versioning/overview
- Google Cloud Dataproc cluster image version lists: https://docs.cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- Apache Hadoop YARN ResourceManager HA documentation: https://hadoop.apache.org/docs/stable/hadoop-yarn/hadoop-yarn-site/ResourceManagerHA.html
- Apache Hadoop YARN commands documentation: https://hadoop.apache.org/docs/r3.2.2/hadoop-yarn/hadoop-yarn-site/YarnCommands.html
- Apache Hadoop HDFS HA documentation: https://hadoop.apache.org/docs/r3.3.6/hadoop-project-dist/hadoop-hdfs/HDFSHighAvailabilityWithNFS.html
- Apache Spark on YARN documentation: https://spark.apache.org/docs/3.5.7/running-on-yarn.html

## Issues Found
- Corrected the HA service layout. The post said YARN ResourceManager ran only as a two-node active-standby pair and implied Hive Metastore itself had built-in master failover. Dataproc HA runs ResourceManager, Hive Metastore, JournalNode, and ZooKeeper on all masters, while HDFS NameNode and ZKFailoverController run only on masters 0 and 1.
- Added the missing Dataproc Jobs API caveat. Google Cloud documentation states Jobs API submissions are not themselves high-availability because job drivers can still terminate if the master running the driver fails.
- Updated verification commands to avoid hard-coded NameNode and ResourceManager IDs. The revised examples use `hdfs haadmin -getAllServiceState`, `hdfs getconf -namenodes`, and `yarn rmadmin -getAllServiceState`.
- Corrected the HDFS replication explanation. Replication factor 3 improves DataNode failure tolerance for fully replicated blocks; it does not specifically protect against master failure, and tolerance depends on enough healthy workers.
- Corrected the external Spark/YARN configuration guidance. Spark on YARN obtains ResourceManager information from Hadoop configuration, so the post now refers to Hadoop client properties/configuration instead of incorrect `spark.yarn.resourcemanager.*` properties.
- Corrected the failover test expectations. A single master failure should leave HDFS and YARN available, but a Dataproc Jobs API job can fail if its driver was on the stopped master.
- Replaced the Cloud SQL Hive Metastore example with a Dataproc Metastore attachment example using the documented `--dataproc-metastore` flag, and clarified that Dataproc Metastore is the recommended managed option.
- Fixed the Mermaid diagram so ZooKeeper, JournalNode, and ResourceManager placement matches Dataproc HA service placement.

## Review Notes
The `2.1-debian11` image version used in examples is still within the listed support period on the current Dataproc image version page, but newer image families may be preferable for new production clusters as Google recommends using current supported image versions.
