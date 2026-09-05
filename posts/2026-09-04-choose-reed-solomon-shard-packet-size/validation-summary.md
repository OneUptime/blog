# Validation Summary: How to Choose Reed-Solomon Shard Size and Packet Size for CPU-Efficient Encoding

## Status
validated

## Post Type
Technical sizing and benchmarking guide. The post contains implementation details and mathematical examples, so it requires technical validation despite having no executable tutorial commands.

## Technologies Covered
- Reed-Solomon erasure coding, shard layouts, padding, and reconstruction
- Intel ISA-L and its erasure-code performance benchmark
- Backblaze JavaReedSolomon and JVM benchmarking
- Ronomon's Reed-Solomon Node.js addon
- Ceph Jerasure, coding techniques, and packet alignment
- SIMD, CPU caches, NUMA, memory budgets, and SSD benchmarking

## Sources Consulted
- Intel ISA-L repository and build documentation: https://github.com/intel/isa-l
- Intel performance source, including buffer validation, allocations, erasure setup, and throughput accounting: https://github.com/intel/isa-l/blob/master/erasure_code/erasure_code_perf.c
- Backblaze performance notes: https://github.com/Backblaze/JavaReedSolomon#performance-notes
- Backblaze benchmark source, retrieved successfully through the raw endpoint after GitHub page retrieval errors: https://raw.githubusercontent.com/Backblaze/JavaReedSolomon/master/src/main/java/com/backblaze/erasure/ReedSolomonBenchmark.java
- Backblaze encoding and reconstruction API source: https://raw.githubusercontent.com/Backblaze/JavaReedSolomon/master/src/main/java/com/backblaze/erasure/ReedSolomon.java
- Ronomon API usage and shard-size contract: https://github.com/ronomon/reed-solomon#usage
- Ceph Jerasure documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/
- Ceph Jerasure implementation, including technique-specific packet handling and alignment: https://github.com/ceph/ceph/blob/main/src/erasure-code/jerasure/ErasureCodeJerasure.cc
- Official fio documentation on buffered/direct I/O, SSD preconditioning, steady-state measurement, and reporting: https://fio.readthedocs.io/en/latest/fio_doc.html

## Issues Found
1. **Memory estimate presented as a universal lower bound.** The original working-set inequality assumed all data and parity windows are resident. Streaming implementations and selective reconstruction need not retain that exact set. Replaced it with a resident-buffer equation and stated its assumption. The 14 MiB and 448 MiB examples remain correct for the described full-buffer workload.
2. **Unqualified equivalence of windowed and whole-shard encoding.** Added the requirement to preserve coding parameters and symbol/packet grouping at window boundaries. Byte-oriented offset encoding supports the example, while packet-based techniques impose their own grouping constraints.
3. **Ceph documentation version scope.** Identified the cited latest documentation as development-version documentation, matching its banner. Its maintenance and deprecation warnings are accurately reported, but should not imply identical policy across all released Ceph versions.
4. **Padding formula lacked a shard-size assumption.** The formula is correct for minimally sized equal byte shards, but not for arbitrary fixed-size shards discussed earlier. Stated the minimum-size assumption and supplied the fixed-size single-stripe formula with its capacity condition. Both expressions count data padding, excluding parity.
5. **Corruption was not explicitly converted into erasures.** Added missing-shard flags/list setup and explained that these erasure APIs do not automatically locate silent corruption. Backblaze reconstruction trusts presence flags and returns immediately when all shards are present; simply corrupting a buffer does not request reconstruction.

## Review Notes
- Verified full-stripe useful/stored byte equations and the parity overhead ratio algebraically. Confirmed that 14 MiB multiplied by 32 equals 448 MiB.
- Confirmed Ronomon's eight-byte shard-size multiple and ISA-L benchmark's 64-byte length check. These are implementation-specific requirements, not universal Reed-Solomon constraints.
- Backblaze offers multiple coding loops. Its benchmark uses fixed workload/cache assumptions, warm-up passes, and original input bytes for throughput. ISA-L's benchmark counts data plus parity for encode throughput, so the post correctly requires an explicit denominator before comparing results.
- Ceph documents a 2048-byte packet default. Source inspection confirms packet handling depends on the technique: the Vandermonde path calls matrix encoding without a packet argument, while scheduled techniques pass packet size and use it in alignment calculations.
- Cache sweeps, realistic concurrency, loss-pattern tests, deterministic correctness checks, latency percentiles, memory accounting, and end-to-end storage measurements are appropriate methodological guidance. They do not establish a universal optimal size or a measured capacity guarantee.
- The linked official resources resolve to the intended projects and documentation. The Backblaze benchmark was inspected through its official raw source because the browser retrieval of the GitHub file page failed.
- No executable commands or configuration snippets are supplied in the post. Review consisted of documentation/source inspection and arithmetic checks; no codec, SSD, or production performance benchmark was run.
- Changes preserve the existing sections and writing style and are limited to technical qualifications and corrections. Validation date: 2026-09-05. Upstream master/main and latest documentation can change.
