# How to Choose Reed-Solomon Shard Size and Packet Size for CPU-Efficient Encoding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Erasure Coding, Performance, Storage, Benchmarking, Capacity Planning

Description: Choose Reed-Solomon shard and packet sizes with cache-aware measurements, bounded memory, realistic recovery tests, and library-specific alignment rules.

---

Reed-Solomon sizing involves several different units that are often confused. A shard is one data or parity fragment in a stripe. A stripe contains `K` data shards and `M` parity shards. A packet or chunk is the smaller batch a particular implementation processes inside a shard. Some APIs expose packet size, while others expose only buffer length and choose their own vectorized loop.

There is no universal fastest value. CPU cache, SIMD implementation, memory bandwidth, allocation behavior, storage I/O, and workload concurrency all move the optimum. Pick a defensible starting range, then benchmark the exact codec and hardware.

## Start with the Size Equations

For one full stripe:

```text
useful data bytes       = K * shard_size
stored bytes            = (K + M) * shard_size
storage overhead ratio  = M / K
codec working set       >= (K + M) * active_chunk_size
```

The last expression is only a lower bound. Decode matrices, tables, temporary outputs, checksums, queues, and application copies consume more memory. With concurrency `C`, approximate the buffer budget before implementation overhead as:

```text
C * (K + M) * active_chunk_size
```

For example, a `10+4` layout processing 1 MiB from each shard has at least 14 MiB of live shard buffers per operation. At 32 concurrent operations, that alone is 448 MiB. Increasing buffers can reduce call overhead but cause cache misses, garbage collection, or memory pressure at scale.

## Separate Shard Size from Processing Chunk Size

A large on-disk shard need not be passed to the codec in one call. A file can use 64 MiB shards while the application encodes 256 KiB windows at matching offsets across all shards. This limits memory while preserving the on-disk layout.

Choose the on-disk shard size from:

- desired stripe width and object-size distribution;
- storage request granularity and maximum object count;
- recovery parallelism and failure-domain placement;
- tail-padding waste for small objects;
- latency required before a stripe can be committed.

Choose the active processing chunk from:

- codec alignment constraints;
- L2 and last-level cache behavior;
- SIMD width and memory bandwidth;
- per-call, task-scheduling, and checksum overhead;
- concurrency and total memory limit.

Do not enlarge the failure domain merely to make a benchmark faster. Placement across hosts, racks, or zones remains a durability decision.

## Honor the Exact Library Contract

Alignment rules are implementation-specific. Ronomon's Node.js addon requires the size of each shard buffer passed to the operation to be a multiple of eight bytes. The current Intel ISA-L `erasure_code_perf` program requires its test buffer size to be a multiple of 64 bytes. These are API or benchmark requirements, not a mathematical property of every Reed-Solomon code.

Backblaze JavaReedSolomon offers multiple coding-loop orderings because the fastest loop depends on processor and buffer shape. Its official benchmark should be edited or wrapped to match the production `K`, `M`, buffer size, and JVM. A result copied from another CPU or default workload is not a capacity number.

Ceph's Jerasure plugin exposes `packetsize`, with 2048 bytes documented as its default. That knob belongs to that plugin and its selected technique. Current Ceph documentation also warns that the Jerasure library is no longer maintained and that techniques other than `reed_sol_van` are deprecated. Do not transplant `2048` into ISA-L, JavaReedSolomon, or another codec simply because the term packet appears similar.

Record all format-defining parameters in metadata. Even when packet size affects only performance, verify that assumption against the chosen library. `K`, `M`, field polynomial, matrix construction, shard ordering, padding, and library revision can determine compatibility.

## Benchmark a Geometric Size Sweep

Test powers of two around the storage and cache boundaries instead of tuning one guessed value:

```text
4 KiB, 16 KiB, 64 KiB, 256 KiB, 1 MiB, 4 MiB
```

Remove sizes the implementation rejects, and add the application's real request sizes. For each candidate, run:

1. healthy encode of all `M` parity shards;
2. reconstruction of one missing data shard;
3. reconstruction of the maximum planned number of missing shards;
4. parity verification or checksum calculation;
5. the same operations at realistic concurrency.

Warm up a JIT-based implementation before measurement. Report both warm-cache and data sets larger than the last-level cache. Randomize trial order, pin the software revision, keep CPU frequency and NUMA placement observable, and repeat long enough to obtain stable confidence intervals.

A simple results table should include:

| Field | Why it matters |
| --- | --- |
| CPU model, microcode, cores, NUMA node | Defines the execution platform |
| Codec commit and compiler flags | Makes the result reproducible |
| `K`, `M`, shard size, active chunk | Defines the workload |
| Operation and erasure pattern | Encode and decode costs differ |
| Concurrency | Reveals saturation and queueing |
| Useful GiB/s | Counts original data once |
| Physical GiB/s | Counts all buffers or I/O |
| CPU cycles per useful byte | Supports capacity estimates |
| p50, p95, p99 latency | Shows tail cost hidden by throughput |
| LLC misses and memory bandwidth | Explains cache and bandwidth ceilings |

Useful encode throughput is normally based on `K * bytes_processed_per_data_shard`. State the denominator. Reporting `(K+M)` bytes as useful work makes parity-heavy layouts appear artificially faster.

## Include End-to-End Storage Behavior

A memory-only codec test answers whether the CPU can keep up. It does not include SSD reads, parity writes, checksums, network transport, allocation, or durable flushes. Run a second test through the actual storage pipeline.

Use a dedicated scratch namespace, never a production device. Precondition SSDs consistently, ensure the data set exceeds RAM when testing storage rather than cache, and document whether I/O is buffered or direct. Measure foreground traffic alongside rebuild traffic because a large chunk that maximizes standalone encoding may create unacceptable request latency when recovery competes for I/O.

Test the real object-size distribution. For an object of length `L`, a simple single-stripe layout pads to:

```text
padding = K * ceil(L / K) - L
```

Alignment can increase that further. Millions of small objects may lose more capacity to headers, allocation units, and padding than to the nominal `M/K` parity ratio. Packing small records changes recovery scope and update behavior, so treat it as a separate format design.

## Gate Every Performance Run on Correctness

Populate buffers with deterministic pseudorandom data, encode, corrupt or remove chosen copies, reconstruct, and compare every recovered byte or a cryptographic object digest. Exercise first and last bytes of each active chunk and lengths just below, at, and above boundaries.

Reject results from any run with a mismatch. Check that missing buffers are not accidentally still readable by the decoder, that output buffers do not alias input buffers unless supported, and that padding is excluded from the final object hash. A fast test with an invalid erasure setup measures the wrong operation.

## Select the Knee, Not the Largest Number

Plot useful throughput and p99 latency against chunk size at each target concurrency. Select the smallest size near the throughput plateau that also meets memory and latency budgets. A candidate is deployable only when:

- CPU headroom remains under normal writes and degraded recovery;
- aggregate buffers fit the enforced memory limit;
- storage and network queues remain within latency objectives;
- every supported object length and loss pattern passes validation;
- the result is repeatable after restart and under sustained load.

Keep the size configurable only if metadata compatibility is preserved, and roll out with a canary. Rebenchmark after compiler, JVM, Node.js, codec, CPU, or firmware changes.

## Conclusion

Shard size is a storage-layout choice, while active chunk or packet size is usually a processing choice. Apply the chosen library's exact alignment rules, sweep sizes across cache boundaries, measure encode and degraded decode at production concurrency, and include an end-to-end SSD test. The best setting is the smallest point near the throughput plateau that preserves correctness, memory headroom, and tail latency.

## Official Documentation

- [Intel ISA-L repository and build documentation](https://github.com/intel/isa-l)
- [Intel ISA-L erasure-code performance source](https://github.com/intel/isa-l/blob/master/erasure_code/erasure_code_perf.c)
- [Backblaze JavaReedSolomon performance notes](https://github.com/Backblaze/JavaReedSolomon#performance-notes)
- [Backblaze ReedSolomonBenchmark source](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomonBenchmark.java)
- [Ronomon Reed-Solomon API](https://github.com/ronomon/reed-solomon#usage)
- [Ceph Jerasure erasure-code plugin documentation](https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/)
