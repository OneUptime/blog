# Validation Summary: How to Mix Replicated and Erasure-Coded Directories Safely in One HDFS Cluster

## Status
validated

## Post Type
Technical guide with HDFS administration and migration commands.

## Technologies Covered
- Apache Hadoop 3.5.0 and HDFS
- HDFS replication and Reed-Solomon erasure coding
- DistCp
- Bash pipelines and SHA-256 content validation
- Intel ISA-L

## Sources Consulted
- Apache Hadoop 3.5.0 HDFS Erasure Coding: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html
- Apache Hadoop DistCp Guide: https://hadoop.apache.org/docs/current/hadoop-distcp/DistCp.html
- Apache Hadoop FileSystem Shell: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html
- Apache Hadoop 3.5.0 SimpleCopyListing source, especially computeSourceRootPath: https://github.com/apache/hadoop/blob/rel/release-3.5.0/hadoop-tools/hadoop-distcp/src/main/java/org/apache/hadoop/tools/SimpleCopyListing.java
- Installed Bash built-in documentation: `bash -c 'help set'`, for errexit and pipefail behavior.

## Issues Found
1. **Policy inheritance was stated unconditionally.** Qualified it as the default and mentioned the client option to request replication when creating a file. Directory policy alone does not guarantee every newly created file is striped.
2. **Migration preconditions were missing.** Specified closed, unchanged source files and a candidate path that does not already exist. Concurrent source changes undermine validation, and DistCp destination existence changes directory nesting for this invocation.
3. **Combined digests were presented as exact file identity checks.** Clarified that they cover only the concatenated matching part files. Required comparison of relative filenames and exact byte lengths in matching order to preserve file boundaries and identify the scope of validation.
4. **Digest pipelines could conceal HDFS read errors.** Added `set -e -o pipefail` and instructed readers to run the example as a Bash script. A successful hashing process must not mask an unsuccessful upstream read.
5. **The final concatenation warning was overly broad.** Limited it explicitly to HDFS `concat()` across incompatible file layouts and clarified that shell `-cat` streaming is supported.

## Review Notes
- Confirmed the policy administration flags, default inheritance, unset behavior, file layout retention after rename, and conversion by rewriting.
- Confirmed Hadoop 3.5 append/truncate restrictions, NEW_BLOCK append exception, sync limitations, and concat policy checks.
- Confirmed nominal 1.5x storage for a full 6+3 stripe, topology checks, CPU/network considerations, shared recovery resources, and the ISA-L detection command.
- Checked the shell command forms for mkdir, put, mv, count, find, test, and cat. The inventory captures human-readable policy output rather than a normalized policy identifier; it assumes filenames without embedded newlines or tabs and can be expensive on large trees.
- The referenced Apache documentation URLs resolve to Hadoop 3.5.0 at review time. Their current-version URLs can change in the future.
- The migration intentionally omits DistCp policy preservation (`-pe`), allowing destination policy inheritance. Paths assume the configured default filesystem is the intended HDFS cluster.
- Counts with `-h` are a coarse comparison; exact lengths belong in the validation manifest. Small canaries test layout selection, not EC performance or storage efficiency.
- No HDFS cluster execution was performed: Hadoop and HDFS executables are unavailable locally. All Bash code blocks passed `bash -n`; validation JSON was parsed and checked. No configuration snippets or deprecated APIs required correction.
