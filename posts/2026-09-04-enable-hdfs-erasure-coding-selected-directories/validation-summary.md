# Validation Summary: How to Enable Erasure Coding for Selected HDFS Directories and Verify the Active Policy

## Status

validated

## Post Type

Tutorial / operational guide with HDFS administration commands and Bash examples.

## Technologies Covered

- Apache Hadoop 3.5.0 and HDFS
- Reed-Solomon erasure coding and directory policies
- HDFS filesystem shell and EC administration CLI
- Java HDFS output stream builders and durability semantics
- Bash

## Sources Consulted

- Apache Hadoop 3.5.0 HDFS Erasure Coding: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html
- Apache Hadoop 3.5.0 HDFS Commands Guide: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html
- Apache Hadoop 3.5.0 FileSystem Shell: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html
- Apache Hadoop 3.5.0 HdfsAdmin API: https://hadoop.apache.org/docs/current/api/org/apache/hadoop/hdfs/client/HdfsAdmin.html
- Apache Hadoop 3.5.0 FSDataOutputStreamBuilder API: https://hadoop.apache.org/docs/current/api/org/apache/hadoop/fs/FSDataOutputStreamBuilder.html
- Apache Hadoop release-3.5.0 DistributedFileSystem source, including HdfsDataOutputStreamBuilder: https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs-client/src/main/java/org/apache/hadoop/hdfs/DistributedFileSystem.java
- Apache Hadoop release-3.5.0 FSDirWriteFileOp source, including replicated file creation: https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs/src/main/java/org/apache/hadoop/hdfs/server/namenode/FSDirWriteFileOp.java
- Apache Hadoop release-3.5.0 DFSStripedOutputStream source, including partial-stripe parity generation: https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs-client/src/main/java/org/apache/hadoop/hdfs/DFSStripedOutputStream.java

## Issues Found

1. The opening stated policy inheritance unconditionally. Qualified it as the default because clients can override the inherited policy when creating a file. The HDFS builder supports explicit EC policy selection and forced replication.
2. The replication builder method was attributed to FSDataOutputStreamBuilder, which does not expose replicate(). Changed the reference to DistributedFileSystem.HdfsDataOutputStreamBuilder.replicate(), verified in the versioned implementation. The EC overview itself uses the imprecise base-class reference.
3. The rollback instructions said the replication policy forces three replicas. Clarified that it selects replicated storage while the client creation settings determine the replica count. FSDirWriteFileOp retains the supplied replication factor for contiguous files; the directory policy does not hard-code three. The EC overview's three-way wording assumes the normal default.

## Review Notes

- Verified the EC command names and options, policy enablement, topology prerequisites, prospective directory settings, file-level queries, and rename/copy distinction.
- Confirmed the five built-in EC policies, default RS-6-3 policy, CPU/network considerations, and three-rack minimum guidance. Balanced placement and healthy nodes remain operational prerequisites.
- Checked the 6 MiB data / 9 MiB stored full-stripe calculation and three-erasure recovery claim. Partial stripes use zero-filled encoding buffers and shorter parity cells where applicable; the full-stripe ratio is not a universal physical-space estimate.
- Confirmed setrep does not convert EC files and checked the stated append, truncate, mixed-policy concat, and sync limitations. Hadoop 3.5.0 supports append to a closed striped file with NEW_BLOCK; the post appropriately qualifies its statement as ordinary append.
- Verified mkdir, put, find, test, cat, and checksum syntax against the filesystem shell reference. All Bash examples passed bash -n. The enumeration loop assumes paths do not contain newline characters; a future generalized inventory tool could use find -print0 and a NUL-delimited reader.
- The canary requires a previously unused destination filename: put fails if it already exists. Reading checks data checksums; the checksum command returns file checksum information and does not by itself prove all parity blocks are healthy.
- All three technical documentation links resolve to the intended resources and currently identify Hadoop 3.5.0. The /current/ URLs can track later releases.
- This was a documentation and source review with shell syntax validation. No live Hadoop cluster was used, so runtime permissions, topology, recovery behavior, and performance were not tested.
