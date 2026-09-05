# How to Benchmark Erasure-Coding Throughput Before Deploying It on SSD Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Erasure Coding, Benchmarking, Performance, SSD, Capacity Planning

Description: Benchmark erasure-code CPU speed and end-to-end SSD throughput with reproducible layouts, realistic recovery loads, integrity checks, and explicit acceptance gates.

---

An erasure-code microbenchmark can report many gigabytes per second while a storage service remains limited by SSDs, memory bandwidth, checksums, network transfers, or durable-write latency. Before deployment, measure two layers separately: the codec in memory and the complete data path on dedicated SSD scratch space.

The purpose is not to publish the largest number. It is to prove that the selected `K+M` layout meets throughput, recovery time, CPU, memory, and latency objectives on the hardware and software revision that will run it.

## Define the Work and Denominators

For `K` data shards, `M` parity shards, and shard length `S`:

```text
useful bytes per full stripe  = K * S
encoded bytes per stripe      = (K + M) * S
parity overhead ratio         = M / K
full-stripe write ratio        = (K + M) / K
```

Always label throughput as one of:

- useful throughput, counting original application bytes once;
- codec buffer throughput, counting the buffers touched;
- physical storage throughput, counting all bytes read and written;
- network throughput, counting bytes crossing the measured link.

If a `10+4` encoder consumes 10 GiB/s of data and produces 4 GiB/s of parity, it is 10 GiB/s useful encode throughput and 14 GiB/s of logical input-plus-output buffer throughput. Actual memory traffic depends on cache reuse, repeated input reads, write allocation, and extra copies. Calling it 14 GiB/s of user throughput would be misleading.

## Record a Reproducible Test Envelope

Capture this information with every result:

```bash
uname -a
lscpu
numactl --hardware
lsblk -o NAME,MODEL,SERIAL,SIZE,ROTA,TRAN,MOUNTPOINTS
nvme list
fio --version
git -C isa-l rev-parse HEAD
```

Also record BIOS power settings, CPU governor and frequency behavior, memory size and channels, NUMA binding, kernel, filesystem and mount options, SSD firmware, compiler and flags, and thermal conditions. Change one independent variable at a time.

Use a dedicated benchmark host or an isolated maintenance window. Never aim a write benchmark at a raw production device or a filesystem containing required data. The example paths below are placeholders for a disposable, confirmed scratch mount.

## Establish an SSD Baseline First

End-to-end useful throughput is bounded by the storage data path, even when the in-memory codec is faster. Characterize sequential read and write bandwidth, latency, and scaling with jobs and queue depth. A conservative fio job file for a preallocated scratch file might begin with:

```ini
[global]
ioengine=io_uring
direct=1
thread=1
time_based=1
runtime=120
ramp_time=20
group_reporting=1
bs=1M
iodepth=16
size=64G
directory=/confirmed-disposable-benchmark-mount

[seq-write]
rw=write
filename=ec-baseline.dat
fsync_on_close=1
```

Save this as `baseline-write.fio`. Create `baseline-read.fio` with the same settings, but rename the job to `[seq-read]`, set `rw=read`, remove `fsync_on_close=1`, and set `allow_file_create=0`. Create the directory on the explicitly approved scratch filesystem and verify its mount and free capacity. Before measuring reads, write and flush the entire configured file range; preallocation alone can leave unwritten extents that return zeros without SSD reads. A time-limited write run does not guarantee full coverage. Then run:

```bash
fio --readonly baseline-read.fio --output-format=json --output=read.json
fio baseline-write.fio --output-format=json --output=write.json
```

Use separate read and write job files so the `--readonly` guard is meaningful for the read test. Adapt engine and alignment to the production filesystem and platform. `direct=1` reduces page-cache influence but does not bypass every device cache. `fsync_on_close=1` tests a particular durability boundary, not per-stripe synchronous latency. If the application flushes each group, model that exact behavior in a separate test.

Precondition SSDs consistently. For buffered tests intended to exceed page cache, use a data set larger than available cache; effective direct I/O does not require a data set larger than RAM. Monitor temperature, media errors, throttling, garbage collection, and actual device utilization. A short fresh-drive burst is not sustainable throughput.

## Build and Validate an Optimized Codec

Intel ISA-L supplies optimized Reed-Solomon operations over `GF(2^8)` and includes tests and performance programs. Build a pinned release or reviewed commit:

```bash
git clone https://github.com/intel/isa-l.git
cd isa-l
git checkout REVIEWED_RELEASE_OR_COMMIT
./autogen.sh
./configure
make -j8
make check
make perfs
git rev-parse HEAD
```

ISA-L's API deliberately does not validate every pointer and argument, so an application wrapper must validate buffer counts, lengths, alignment, and output ownership. `make check` validates the build; it does not validate the application's storage format.

The included performance program accepts data count, parity count, a simulated unavailable-buffer count, and per-buffer size in current source:

```bash
./erasure_code/erasure_code_perf -h
./erasure_code/erasure_code_perf -k 10 -p 4 -e 1 -s 1M
./erasure_code/erasure_code_perf -k 10 -p 4 -e 4 -s 1M
```

Confirm the binary path produced by the pinned build rather than assuming it. The program requires its supplied buffer size to be a multiple of 64 bytes. Without `-s`, its default build repeatedly uses a small data set. With `-s 1M`, the working set is larger, so confirm that it fits the target cache before calling the result warm-cache. The compile-time `COLD_TEST` setting changes the default size using `GT_L3_CACHE` (32 MiB by default), which may be smaller than a modern last-level cache and is overridden by `-s`. Current source also supports runtime `--cold`, which rotates buffer sets in a roughly 10 GiB allocation; verify the actively touched working set exceeds the target cache. Record the build settings and runtime mode. Run cache-resident and cache-exceeding cases to distinguish codec execution from memory-system limits. The runtime `--cold` path skips the final recovered-buffer comparison, so its printed pass message is not an integrity check; validate those results with the correctness harness below.

Although the option is named `-e`, the harness deliberately withholds buffers at known indexes and reconstructs them. It therefore measures erasure recovery, not localization and correction of unknown corrupt symbols. Do not use that number to claim mixed error-and-erasure performance.

The current decode benchmark also constructs and inverts the decode matrix before its timed kernel loop. That is reasonable when one failure pattern is reused across many stripes, but it excludes setup latency when the missing-index pattern changes. Measure matrix setup and buffer orchestration in the end-to-end harness if short objects or rapidly changing patterns make those costs significant. Its reported encode rate counts `(K+M)*S` bytes and its decode rate counts `(K+E)*S` bytes for `E` erasures; convert these to the useful-byte denominator before comparing results.

## Use a Production-Shaped Test Matrix

For every candidate layout and active buffer size, measure:

| Scenario | What it reveals |
| --- | --- |
| Healthy encode | Foreground parity CPU cost |
| One missing data shard | Common degraded-read cost |
| `M` missing shards | Worst supported reconstruction cost |
| Parity-only loss | Repair cost without reassembling the object |
| Scrub or parity verification | Background integrity overhead |
| Encode plus recovery | Contention during a real incident |

Sweep at least the application request sizes and representative powers of two. Test one stream, the expected foreground concurrency, and the maximum controlled recovery concurrency. Repeat trials in randomized order. Warm up JITs if present, but do not discard cold-cache results.

Measure CPU utilization and cycles per useful byte, memory bandwidth, LLC misses, allocations, context switches, NUMA traffic, and p50/p95/p99 operation latency. Stop increasing concurrency when useful throughput flattens or tail latency, CPU, memory, SSD queueing, or network saturation breaches its limit.

## Benchmark the Complete SSD Pipeline

The end-to-end harness should perform the same stages as production:

```text
read or receive K data buffers
calculate or verify shard digests
encode M parity buffers
write K+M indexed shards to real placement targets
apply the intended durability operation
publish an authenticated manifest
```

Then repeat with selected shard files unavailable and time:

```text
read K verified survivors
construct the decode matrix
reconstruct missing buffers
write replacement shards
verify their digests
reassemble and hash the original object
```

Use a data set that exceeds page cache and the SSD controller's short-lived write cache. If production uses the network, TLS, compression, encryption, object-store requests, or checksumming, include them in this layer. Run steady foreground traffic while recovery operates at its configured limit and measure the foreground latency penalty.

Do not sum nominal drive specifications. Erasure sets advance at the rate of their slowest necessary participant, and PCIe lanes, NUMA links, filesystem locks, network links, or one thermal-throttled SSD can dominate.

## Make Correctness a Benchmark Precondition

Performance output is invalid unless the bytes are correct. For every measured iteration or sampled batch:

1. Fill data shards from deterministic pseudorandom input.
2. Save an independent SHA-256 digest of the useful object.
3. Encode and save authenticated per-shard digests.
4. Make selected shard buffers genuinely unavailable.
5. Reconstruct into separate output buffers.
6. Compare reconstructed shard digests and the final object digest.
7. Fail the entire run on any mismatch.

Use a matrix that guarantees recovery from any `M` erasures for the selected layout. ISA-L’s `gf_gen_rs_matrix`, used by this performance program, does not guarantee this for every supported size; the shown `10+4` layout is within its documented safe limits. Validate other layouts against those limits or use a suitable matrix such as `gf_gen_cauchy1_matrix`. Test losses at the first, middle, and last shard indexes, all single erasures, representative combinations, and exactly `M` erasures. Verify that `M+1` missing shards fail closed. Include lengths just below and above stripe boundaries so padding and truncation errors cannot hide.

Use scratch copies for destructive drills. Never delete or overwrite the only generation of a test corpus that is also needed as evidence. Retain raw result JSON, logs, configuration, hashes, and the software commit together.

## Set Deployment Gates Before Reading Results

Agree on thresholds first. A useful gate can require:

```text
healthy useful throughput       >= planned peak * headroom factor
worst supported rebuild time    <= recovery objective
foreground p99 during recovery  <= service objective
CPU utilization at peak         <= reserved CPU budget
codec memory at concurrency      <= enforced memory budget
SSD and network utilization     <= safe sustained ceiling
correctness failures             = 0
```

Include node failure in the capacity model. If one node disappears, survivors handle extra reads, writes, and CPU while fewer devices remain. Leave headroom for scrubbing, checksums, compaction, and application work rather than allocating 100 percent of benchmark throughput.

Canary the chosen limits on a non-critical storage class, monitor real useful and physical bandwidth, and trigger a recovery drill before expanding. Re-run the benchmark after codec, compiler, kernel, firmware, JVM or runtime, CPU, SSD, filesystem, encryption, or layout changes.

## Conclusion

A credible SSD erasure-coding benchmark reports useful work, physical traffic, latency, CPU, memory, and correctness separately. Validate the codec in memory, establish sustainable SSD limits, then measure the full durable write and degraded-recovery paths under concurrent foreground load. Deploy only when the worst supported loss case meets predeclared gates with zero digest failures and meaningful operating headroom.

## Official Documentation

- [Intel ISA-L repository and build targets](https://github.com/intel/isa-l)
- [Intel ISA-L erasure-code API documentation](https://github.com/intel/isa-l/blob/master/doc/functions.md)
- [Intel ISA-L erasure_code_perf source](https://github.com/intel/isa-l/blob/master/erasure_code/erasure_code_perf.c)
- [fio official documentation](https://fio.readthedocs.io/en/latest/fio_doc.html)
- [fio upstream HOWTO source](https://github.com/axboe/fio/blob/master/HOWTO.rst)
