# How to Measure the Read-Performance Cost of HDFS Erasure Coding Before Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, Erasure Coding, Performance, Benchmarking

Description: Benchmark replicated and erasure-coded HDFS reads with identical data, controlled cache conditions, integrity checks, and separate healthy and degraded scenarios.

---

The cost of an HDFS erasure-coded read is workload-specific. Healthy sequential reads can benefit from parallel internal-block access, while small, random, off-rack, or degraded reads can pay extra scheduling, network, and decoding costs. A useful migration test therefore compares the same bytes and access pattern under both layouts and records more than elapsed time.

Do this in a representative staging cluster. Deliberately failing a DataNode in production just to obtain a benchmark is not a safe test method.

## Define the Question Before Running It

Record these variables with every result:

- Hadoop version and EC policy;
- DataNode, rack, drive, CPU, and network topology;
- native coder status;
- file-size distribution and read pattern;
- client count and concurrency;
- healthy or degraded state;
- cold-cache or warm-cache run;
- application bytes returned, wall time, CPU, and network bytes.

For `RS-6-3-1024k`, each full stripe contains six 1 MiB data cells plus three parity cells. The client maps logical ranges to internal blocks and issues reads in parallel. On failure it requests additional blocks and decodes. A single MB/s number cannot describe all of those paths.

## Verify the Cluster First

```bash
hdfs ec -verifyClusterSetup -policy RS-6-3-1024k
hdfs ec -listCodecs
hadoop checknative
hdfs dfsadmin -report
```

Hadoop's default RS and XOR coder configuration prefers native ISA-L and falls back to pure Java. Capture `hadoop checknative` on the benchmark client and every DataNode image; an accelerated client with unaccelerated DataNodes can distort degraded-read conclusions.

## Create Matched Datasets

Use incompressible or production-like bytes. Keep a local manifest so correctness is independent of HDFS's layout-specific checksum representation:

```bash
mkdir -p /tmp/hdfs-read-fixture
for n in 00 01 02 03 04 05 06 07; do
  dd if=/dev/urandom \
    of="/tmp/hdfs-read-fixture/object-$n.bin" \
    bs=1M count=1024 status=progress
done

(cd /tmp/hdfs-read-fixture && sha256sum object-*.bin) \
  >/tmp/hdfs-read-fixture/SHA256SUMS
```

Create explicit destinations and upload the same local files independently. Copying or renaming an existing HDFS file does not necessarily recode it, so query the resulting files:

```bash
hdfs dfs -mkdir -p /bench/read-replicated /bench/read-ec
hdfs ec -setPolicy -path /bench/read-replicated -replicate
hdfs ec -setPolicy -path /bench/read-ec -policy RS-6-3-1024k

hdfs dfs -put /tmp/hdfs-read-fixture/object-*.bin /bench/read-replicated/
hdfs dfs -put /tmp/hdfs-read-fixture/object-*.bin /bench/read-ec/

hdfs ec -getPolicy -path /bench/read-replicated/object-00.bin
hdfs ec -getPolicy -path /bench/read-ec/object-00.bin
```

Stream each dataset back once and compare it with the external manifest:

```bash
for layout in read-replicated read-ec; do
  for n in 00 01 02 03 04 05 06 07; do
    hdfs dfs -cat "/bench/$layout/object-$n.bin" |
      sha256sum
  done >"/tmp/$layout.sha256"
done

cut -d' ' -f1 /tmp/hdfs-read-fixture/SHA256SUMS >/tmp/expected.hashes
cut -d' ' -f1 /tmp/read-replicated.sha256 >/tmp/replicated.hashes
cut -d' ' -f1 /tmp/read-ec.sha256 >/tmp/ec.hashes
cmp /tmp/expected.hashes /tmp/replicated.hashes
cmp /tmp/expected.hashes /tmp/ec.hashes
```

## Run Interleaved Trials

Avoid running all replicated trials first and all EC trials second. Background load, JVM warm-up, and cache state drift over time. Alternate layouts and vary file order:

```bash
run_read() {
  layout=$1
  object=$2
  /usr/bin/time -f \
    "layout=$layout object=$object elapsed=%e user=%U sys=%S rss_kib=%M" \
    hdfs dfs -cat "/bench/$layout/$object" >/dev/null
}

run_read read-replicated object-00.bin 2>>/tmp/hdfs-read-results.txt
run_read read-ec         object-03.bin 2>>/tmp/hdfs-read-results.txt
run_read read-replicated object-05.bin 2>>/tmp/hdfs-read-results.txt
run_read read-ec         object-01.bin 2>>/tmp/hdfs-read-results.txt
```

Run enough repetitions to report median and tail latency, not only the best run. Keep warm-cache and cold-cache results separate. Clearing Linux page cache on one machine does not clear every DataNode cache, and cluster-wide cache eviction can disrupt other workloads. Prefer freshly generated datasets larger than aggregate caches or an isolated cluster rather than `drop_caches` on shared hosts.

Test at least:

1. one-client sequential scans;
2. production concurrency and file-size mix;
3. range or random reads if the application uses them;
4. a controlled degraded read with one unavailable internal block;
5. reads while EC reconstruction is active.

Use the real application or a small client built on the same HDFS API for range tests. Shell `cat` is intentionally a sequential baseline.

## Observe the Whole Data Path

Sample the same interval on clients, DataNodes, and switches. Capture:

- client wall time, CPU time, and garbage collection;
- bytes and operations read per DataNode drive;
- rack uplink bytes, retransmissions, and saturation;
- DataNode CPU and EC reconstruction activity;
- missing/corrupt block counts and read failures;
- p50, p95, and p99 application latency.

For a healthy read, calculate useful throughput as logical bytes returned divided by wall time. For a degraded read, also report network amplification:

```text
useful throughput = logical bytes returned / elapsed seconds
read amplification = bytes read from DataNodes / logical bytes returned
```

Do not label a page-cache benchmark as SSD throughput, and do not mix setup, upload, recovery, and steady-state read time into one rate.

## Set an Acceptance Gate

An example gate might require that, at expected concurrency:

- healthy EC p95 scan time is no more than 15% above replication;
- degraded EC completes without application-visible corruption;
- rack uplinks remain below the operational saturation threshold;
- reconstruction does not violate foreground-read latency objectives;
- all returned bytes match the external manifest.

Use thresholds derived from the service SLO, not these example values. Retain the replicated source until the EC candidate passes both correctness and performance gates.

## Conclusion

Measure HDFS EC as a complete distributed read path, not as a codec microbenchmark. Matched data, file-level policy checks, interleaved trials, integrity verification, and separate degraded tests reveal whether the storage saving fits the actual service objective. Migrate only after representative tail latency and recovery behavior pass a written acceptance gate.

## Official Documentation

- [Apache Hadoop 3.5.0: HDFS Erasure Coding](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html)
- [Apache Hadoop: HDFS Architecture](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
- [Apache Hadoop: Native Libraries Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/NativeLibraries.html)
- [Apache Hadoop: Benchmarking](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-common/Benchmarking.html)
