# Validation Summary: What Changes When You Change `dfs.blocksize`?

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Apache Hadoop 3.5.0
- Hadoop Distributed File System (HDFS)
- HDFS block sizing and file metadata
- Hadoop FileSystem shell and `fsck`
- Hadoop DistCp
- HDFS replication and erasure coding
- HDFS transparent encryption, ACLs, and extended attributes
- MapReduce input splitting

## Sources Consulted

- [HDFS default configuration (`dfs.blocksize`, minimum block size, and checksum modes)](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml)
- [HDFS Architecture Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
- [Hadoop FileSystem Shell Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html)
- [HDFS Commands Guide (`fsck`)](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [Hadoop Commands Guide (generic `-D` options)](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/CommandsManual.html)
- [Hadoop DistCp Guide](https://hadoop.apache.org/docs/current/hadoop-distcp/DistCp.html)
- [DistCp 3.5.0 `DistCpUtils` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-tools/hadoop-distcp/src/main/java/org/apache/hadoop/tools/util/DistCpUtils.java)
- [DistCp 3.5.0 `RetriableFileCopyCommand` source](https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-tools/hadoop-distcp/src/main/java/org/apache/hadoop/tools/mapred/RetriableFileCopyCommand.java)
- [HDFS Transparent Encryption Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/TransparentEncryption.html)
- [HDFS Erasure Coding Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html)
- [Hadoop `FileStatus` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/fs/FileStatus.html)
- [MapReduce `FileInputFormat` API](https://hadoop.apache.org/docs/current/api/org/apache/hadoop/mapreduce/lib/input/FileInputFormat.html)
- [Hadoop Metrics reference](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/Metrics.html)

## Issues Found

- The DistCp example changed the destination block size while leaving Hadoop's default `dfs.checksum.combine.mode=MD5MD5CRC`. That checksum mode is block-layout-dependent, so DistCp can reject a correctly copied, reblocked file during its post-copy checksum comparison. Added `-Ddfs.checksum.combine.mode=COMPOSITE_CRC` so current Hadoop can compare file contents independently of block boundaries.
- Clarified that `COMPOSITE_CRC` still requires compatible checksum types over the same underlying bytes. An encrypted destination can use a new encrypted data encryption key and therefore different ciphertext, so the post now permits `-skipcrccheck` for such incomparable checksums only when paired with independent end-to-end content validation.
- Clarified that preserving DistCp checksum type (`c`) also causes current DistCp to preserve the source block size, so `c` must be omitted during reblocking just like `b`.

## Review Notes

- The review used the current Apache Hadoop 3.5.0 documentation and release source. The post does not claim compatibility with a specific older Hadoop release, so operators should retain its instruction to test the exact flow against their installed release.
- The `stat`, `fsck`, `count`, `getfacl`, and generic `-D` command syntax is current and correct.
- The explanations of per-file block size, append behavior, mixed block sizes, erasure-coding restrictions, raw extended attributes, encryption-zone boundaries, and non-transactional two-rename cutover are technically accurate.
- No live HDFS cluster was available in the workspace; command behavior was validated against the official Hadoop 3.5.0 documentation and implementation source.
