# Validation Summary: Choose HDFS Block Size for Compressed and Splittable Inputs

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- Hadoop MapReduce
- `FileInputFormat` and `InputSplit`
- HDFS erasure coding
- Gzip and bzip2 compression
- HDFS command-line tools and configuration

## Sources Consulted

- [Apache Hadoop 3.5.0 HDFS Architecture](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html#Data_Blocks)
- [Apache Hadoop 3.5.0 HDFS default configuration](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml)
- [Apache Hadoop 3.5.0 MapReduce Tutorial](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html)
- [Apache Hadoop 3.5.0 `FileInputFormat` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/lib/input/FileInputFormat.html)
- [Apache Hadoop 3.5.0 `TextInputFormat` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/lib/input/TextInputFormat.html)
- [Apache Hadoop 3.5.0 `BZip2Codec` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/io/compress/BZip2Codec.html)
- [Apache Hadoop 3.5.0 `GzipCodec` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/io/compress/GzipCodec.html)
- [Apache Hadoop 3.5.0 HDFS Erasure Coding](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html)
- [Apache Hadoop 3.5.0 File System Shell Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html)
- [Apache Hadoop 3.5.0 HDFS Commands Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [Apache Hadoop 3.5.0 `FileSystem` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-common-project/hadoop-common/src/main/java/org/apache/hadoop/fs/FileSystem.java)
- [Apache Hadoop 3.5.0 `DfsClientConf` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-hdfs-project/hadoop-hdfs-client/src/main/java/org/apache/hadoop/hdfs/client/impl/DfsClientConf.java)
- [Apache Hadoop 3.5.0 `CommandWithDestination` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-common-project/hadoop-common/src/main/java/org/apache/hadoop/fs/shell/CommandWithDestination.java)

## Issues Found

- The post described an HDFS block as a physical storage unit. Changed this to a logical storage and replica-placement unit because an HDFS block is a filesystem-level chunk whose replicas are stored by DataNodes, not a physical disk block.
- The block-size tradeoff list treated retry as if it always occurred at HDFS block granularity. Clarified that blocks are the units transferred for replication and recovery, while extra retry work follows only when input splits track block size and a task is retried.
- The throughput example converted 4,800 MiB to 4.8 GiB. Corrected it to 4,800 MiB, or approximately 4.69 GiB, to preserve binary-unit arithmetic.

## Review Notes

- The post's 128 MiB `dfs.blocksize` default and the `dfs.namenode.fs-limits.min-block-size` constraint match Hadoop 3.5.0.
- The `hdfs dfs -Ddfs.blocksize=268435456 -put` example is supported by Hadoop's generic `-D` option and the filesystem create path, subject to the post's stated caveat that the writer must honor the client configuration.
- The `stat` format tokens `%o`, `%b`, and `%n`, plus the `hdfs fsck -files -blocks -locations` options, are current in Hadoop 3.5.0.
- No deprecated APIs or commands are used.
