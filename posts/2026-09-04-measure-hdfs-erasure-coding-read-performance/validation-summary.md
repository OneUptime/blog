# Validation Summary: How to Measure the Read-Performance Cost of HDFS Erasure Coding Before Migration

## Status
validated

## Post Type
Technical guide for benchmarking HDFS reads before an erasure-coding migration.

## Technologies Covered
- Apache Hadoop 3.5.0 and HDFS
- Reed-Solomon erasure coding and replicated storage
- Native ISA-L codecs and Java clients
- Bash, GNU Coreutils, GNU Time, and SHA-256
- Linux page cache and distributed performance measurement

## Sources Consulted
- Apache Hadoop HDFS Erasure Coding: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html
- Apache Hadoop HDFS Commands Guide: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html
- Apache Hadoop FileSystem Shell: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/FileSystemShell.html
- Apache Hadoop HDFS Architecture: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html
- Apache Hadoop Native Libraries Guide: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/NativeLibraries.html
- Apache Hadoop Benchmarking: https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/Benchmarking.html
- GNU Coreutils dd documentation: https://www.gnu.org/software/coreutils/manual/html_node/dd-invocation.html
- GNU Coreutils SHA-2 utilities: https://www.gnu.org/s/coreutils/manual/html_node/sha2-utilities.html
- GNU Time manual: https://www.gnu.org/software/time/manual/time.html
- GNU Bash pipelines: https://www.gnu.org/s/bash/manual/html_node/Pipelines.html
- GNU Bash set builtin: https://www.gnu.org/s/bash/manual/html_node/The-Set-Builtin.html
- Linux kernel page-cache controls: https://docs.kernel.org/admin-guide/sysctl/vm.html#drop-caches

## Issues Found
1. **Unstated command prerequisites.** The commands use GNU-specific options, including Time's `-f`, and assume a Linux environment. Added Bash, GNU Coreutils, and GNU Time prerequisites, including the expected executable path.
2. **Ambiguous decoding location.** Clarified that foreground recovery decoding runs on the client, while background reconstruction uses DataNodes. This prevents attributing reconstruction contention to client codec performance.
3. **Fixture size could be reduced by short reads.** Added `iflag=fullblock` to `dd` so `count=1024` counts complete 1 MiB input blocks when reading the random device.
4. **Validation did not stop on failure.** Added `set -euo pipefail` and instructed readers to run the integrity block as a Bash script. Previously a successful hashing command could mask a failed HDFS read, and a successful second comparison could hide the first comparison's nonzero exit status.
5. **JVM warm-up was described as drifting across shell trials.** Each `hdfs dfs -cat` invocation launches a new client process. Removed that implication and explained that these timings include startup and warm-up; steady-state application measurements need a persistent client.
6. **The degraded scenario did not specify a needed data block.** An unavailable parity block alone need not exercise decoding. Specified an unavailable data internal block required by the requested range.

## Review Notes
- Verified the EC command flags, policy inheritance, stripe composition, native-coder fallback, and read/reconstruction architecture against Apache documentation. No deprecated CLI options were identified in the examples.
- The linked Hadoop pages identify version 3.5.0 at review time. The `/current/` URLs are moving references and may describe a later release in the future. All four official documentation links resolved; the benchmarking page required a retry through the documentation navigation.
- Checked `mkdir`, `put`, and `cat` against the FileSystem Shell reference and `dfsadmin -report` against the HDFS Commands Guide. Existing destination files cause `put` to fail without an overwrite option; use fresh benchmark paths and confirm setup commands succeed.
- The manifest and readback loops use matching filename order. SHA-256 compares application bytes independently of HDFS checksum layout. GNU Time fields describe elapsed time, process CPU time, and peak resident memory; they do not measure distributed CPU or network usage.
- The eight 1 GiB files are an example fixture, not evidence of a cold-cache workload. Uploads and integrity reads affect caches. Confirm actual cache conditions and scale the fixture to the cluster before labeling results cold.
- Logical-byte throughput and read amplification are valid ratios. Attribute the numerator to benchmark traffic; aggregate switch or DataNode traffic can include unrelated work and reconstruction. Four illustrative trials are insufficient to establish reliable p95 or p99 values, as the post's repetition guidance implies.
- The 15% acceptance threshold is explicitly an example, not a Hadoop performance guarantee. Actual performance and recovery behavior require measurements on the representative cluster.
- All five Bash code blocks passed `bash -n`; the validation JSON was parsed and checked. Hadoop executables are unavailable in this workspace, so no uploads, distributed reads, failure scenarios, or performance measurements were executed. This is a documentation and syntax review, not an empirical benchmark validation.
