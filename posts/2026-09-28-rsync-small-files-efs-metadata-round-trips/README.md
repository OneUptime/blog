# Why `rsync` and Millions of Small Files Are Slow on EFS—and How to Reduce Metadata Round Trips

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, Performance

Description: Measure why small-file rsync workloads can be latency-bound on EFS, then reduce metadata work, use bounded parallelism, and verify transfer semantics.

Copying one large file quickly does not predict how fast `rsync` will process a million tiny files on EFS. The latter workload repeatedly discovers names, checks attributes, opens files, updates metadata, and closes files. A low MiB/s rate can coexist with a busy client doing useful metadata work.

The goal is to identify the limiting operation before buying more throughput or changing mount semantics. Use a representative immutable sample and a scratch destination so successive experiments are comparable.

## Measure bytes and files separately

Record source file count, total bytes, size distribution, and directory layout. Then measure elapsed time and files per second alongside throughput:

```bash
/usr/bin/time -p rsync -a --stats -- \
  /data/sample/ /mnt/efs/benchmark/sample/
```

This example preserves ordinary archive metadata. Run it under an identity authorized to set the requested ownership and permissions, or intentionally choose options matching your application's metadata requirements.

Repeat with an unchanged destination and record that result separately. The first run transfers content; an unchanged run still walks and compares the namespace. If both are slow despite little data movement, metadata discovery is a strong candidate.

EFS's distributed architecture adds per-operation overhead, which becomes more noticeable when each operation carries little data. AWS recommends minimizing unnecessary opens and closes and retaining useful client caches for small-file workloads. [EFS small-file performance guidance](https://docs.aws.amazon.com/efs/latest/ug/performance-tips.html)

## Inspect the client before changing service capacity

```bash
nfsstat -m
nfsstat -c
```

Capture counters before and after a bounded sample. Where available, use `nfsiostat` for per-mount activity. Also inspect CPU, memory pressure, and network utilization; compression or checksumming can move the bottleneck onto the client.

For a small diagnostic sample on Linux, a system-call summary can show how much application work involves filenames:

```bash
strace -f -c -e trace=%file \
  rsync -a -- /data/tiny-sample/ /mnt/efs/benchmark/tiny-sample/
```

Tracing perturbs timing and reports application calls, not a one-to-one count of NFS requests. Use it to explain behavior, then benchmark without it.

Check EFS CloudWatch metrics during the same interval. Compare metadata activity with metered I/O and permitted throughput, and inspect applicable IOPS utilization. A throughput ceiling is a different problem from one serial process waiting for many small responses. [EFS CloudWatch metrics](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html)

## Remove unnecessary rsync work deliberately

Rsync's default quick check compares file size and modification time. `--checksum` changes file selection to use content checksums, adding full-file reads on both sides for existing files. Do not add it as a generic speed option. Likewise, a dry run still performs namespace comparison, so `--dry-run` can be slow on a large tree even though it writes nothing. [Rsync manual](https://download.samba.org/pub/rsync/rsync.1)

A transfer between two local paths, including an EFS mount, uses rsync's whole-file behavior by default. Tuning remote delta-transfer options is unlikely to solve metadata latency in that case. Review whether you actually need all archive metadata, but do not drop ownership, timestamps, or permissions when they are required for correctness.

Do not use `--size-only` simply to make a benchmark faster unless equal-size content changes are acceptable to miss. Avoid adding `--delete` to an optimization experiment; deletion behavior should be a separate, explicitly reviewed migration decision.

## Parallelize independent directory shards

When the source is organized into independent top-level directories, start with a small number of workers:

```bash
mkdir -p /mnt/efs/import
find /data/export -mindepth 1 -maxdepth 1 -type d -print0 |
  xargs -0 -r -n 1 -P 4 sh -c '
    source_dir=$1
    shard_name=${source_dir##*/}
    rsync -a -- "$source_dir/" "/mnt/efs/import/$shard_name/"
  ' sh
```

This example copies directory shards only; it intentionally excludes files directly under `/data/export`. This GNU/Linux example uses `xargs -r` to do nothing when no shards are found, and the NUL-delimited pipeline handles spaces in names. Every worker owns a different destination subtree, avoiding overlapping writes and competing delete scopes.

Benchmark one, two, four, and then more workers only while performance improves. Watch application latency and EFS metrics alongside total throughput. A changing source also requires consistency planning: parallel copying does not create a snapshot, so quiesce writers or define an incremental cutover process.

## Change the data layout when the application permits

If consumers repeatedly read thousands of immutable reference files, package them into a format they can read in larger operations. This is an application-format change, so measure startup cost, random access, update granularity, and recovery behavior before adopting it.

Archiving before transfer alone does not eliminate all destination metadata work if you immediately unpack the archive back into a million separate EFS files. It can reduce work along part of the path, while extraction still pays per-file creation costs.

Keep recommended NFS settings and avoid disabling attribute caches to chase a transfer issue. Preserve application consistency requirements when considering caching changes.

Accept an optimization only after checking representative contents, numeric ownership, modes, timestamps, and the application's read behavior. Report both files per second and bytes per second, plus whether the run copied new data or merely scanned unchanged files. Those measurements make the next decision about concurrency, layout, or throughput capacity defensible.
