# Validation Summary: How to Compare Ceph vs HDFS for Big Data Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph (RADOS, RGW, CephFS, RBD, MON, MDS)
- HDFS (Hadoop Distributed File System)
- Rook (Ceph Kubernetes operator)
- Apache Spark (PySpark with S3A connector and HDFS)
- Hadoop ecosystem (YARN, MapReduce, Hive, HBase)
- S3-compatible object storage
- Delta Lake, Apache Iceberg (mentioned as modern data lake formats)

## Sources Consulted
- Ceph official documentation on architecture (MON, MDS, OSD, RADOS components) — https://docs.ceph.com/en/latest/architecture/
- Apache Hadoop HDFS Architecture documentation — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html
- Apache Spark S3A connector configuration — https://hadoop.apache.org/docs/current/hadoop-aws/tools/hadoop-aws/index.html
- HDFS HA documentation (QJM-based NameNode HA) — https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSHighAvailabilityWithQJM.html
- Rook Ceph operator documentation — https://rook.io/docs/rook/latest/

## Issues Found
1. **Ceph metadata service description was inaccurate**: The architecture comparison table listed Ceph's metadata service as "MDS / RADOS". This is misleading because RADOS is the underlying object storage layer, not a metadata service. MDS only handles CephFS file system metadata. Ceph Monitors (MON) are the component responsible for cluster-level metadata (CRUSH maps, OSD maps, monitor maps) using Paxos-based consensus. Changed to "MON / MDS (CephFS)" to accurately reflect that MON handles cluster metadata and MDS handles CephFS-specific metadata.

## Review Notes
- The HDFS example uses port 9000 (`hdfs://namenode:9000/data/`). While 8020 is the standard default NameNode RPC port in Hadoop 2.x/3.x, port 9000 is commonly seen in tutorials and is valid when configured. Left as-is since the port is configurable.
- The Spark S3A configuration properties are all correct and current for Hadoop 3.x.
- The performance comparison table uses qualitative ratings (Good/Excellent/Poor) which are reasonable characterizations but inherently subjective. The general relative rankings are accurate.
- The post correctly identifies the industry trend toward S3-compatible data lakes (Delta Lake, Apache Iceberg) as a factor favoring Ceph over HDFS for new projects.
