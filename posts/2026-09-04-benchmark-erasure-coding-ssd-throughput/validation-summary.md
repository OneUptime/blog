# Validation Summary: How to Benchmark Erasure-Coding Throughput Before Deploying It on SSD Storage

## Status
validated

## Post Type
Technical benchmarking and deployment-readiness guide.

## Technologies Covered
- Reed-Solomon erasure coding over GF(2^8), encoding matrices, and reconstruction.
- Intel ISA-L, Autotools, Make, and Git.
- fio, Linux io_uring, direct I/O, filesystem allocation, and durability operations.
- SSD/NVMe storage, CPU caches, memory bandwidth, NUMA, and capacity planning.
- SHA-256 integrity checks, authenticated metadata, and recovery testing.

## Sources Consulted
- ISA-L repository and build instructions: https://github.com/intel/isa-l
- ISA-L top-level build targets: https://github.com/intel/isa-l/blob/master/Makefile.am
- ISA-L performance-program build paths: https://github.com/intel/isa-l/blob/master/erasure_code/Makefile.am
- ISA-L API overview: https://github.com/intel/isa-l/blob/master/doc/functions.md
- ISA-L API contracts and matrix limits: https://github.com/intel/isa-l/blob/master/include/erasure_code.h
- ISA-L benchmark argument parsing, timing, byte counts, and correctness checks: https://github.com/intel/isa-l/blob/master/erasure_code/erasure_code_perf.c
- ISA-L encoding implementation: https://github.com/intel/isa-l/blob/master/erasure_code/ec_highlevel_func.c
- fio official manual: https://fio.readthedocs.io/en/latest/fio_doc.html
- fio upstream HOWTO: https://github.com/axboe/fio/blob/master/HOWTO.rst
- Linux allocation semantics: https://man7.org/linux/man-pages/man2/fallocate.2.html
- util-linux lscpu manual: https://man7.org/linux/man-pages/man1/lscpu.1.html
- util-linux lsblk manual: https://man7.org/linux/man-pages/man8/lsblk.8.html
- numactl manual: https://man7.org/linux/man-pages/man8/numactl.8.html
- nvme-cli list documentation: https://github.com/linux-nvme/nvme-cli/blob/master/Documentation/nvme-list.txt
- Git command documentation: https://git-scm.com/docs/git-rev-parse, https://git-scm.com/docs/git-clone, https://git-scm.com/docs/git-checkout
- Ceph erasure-code concepts, overhead, and performance considerations: https://docs.ceph.com/en/latest/rados/operations/erasure-code/

## Issues Found
1. **Parity overhead versus total write ratio:** `M/K` measures extra parity bytes relative to useful data, whereas full-stripe shard writes total `(K+M)/K`. Renamed the former and supplied the latter to avoid ambiguous amplification accounting. These ratios exclude filesystem and SSD-internal amplification.
2. **Logical buffer bytes versus actual memory traffic:** The example treated 14 GiB/s as actual memory traffic. Changed it to logical input-plus-output buffer throughput and qualified the effects of cache reuse, repeated reads, write allocation, and copies.
3. **Codec versus end-to-end storage limit:** The original statement implied that an in-memory codec cannot exceed storage speed. Restricted the storage bound to the complete data path.
4. **Incomplete SSD read preparation:** The read job was referenced without its necessary configuration, and preallocation alone did not establish a valid SSD read workload. Specified the read-job changes, disabled implicit file creation for reads, and required a fully written and flushed file range. Explained that a time-limited write does not necessarily cover the full file.
5. **Unnecessary RAM-size requirement for direct I/O:** Replaced the unconditional larger-than-RAM requirement with the distinction between effective direct I/O and buffered tests intended to exceed page cache.
6. **Cache-mode assumptions:** A build label does not prove cache residency. Documented that `-s` overrides the compile-time default, that the default 32 MiB `GT_L3_CACHE` can fit modern LLCs, and that current source offers runtime `--cold`. Added the requirement to check the active working set rather than infer cache behavior from allocation size or labels.
7. **Cold-mode correctness limitation:** Current runtime `--cold` skips the recovered-buffer comparison. Clarified that its pass message does not establish integrity and requires independent validation.
8. **ISA-L output denominators:** Added the actual source-defined byte counts: `(K+M)*S` for encode and `(K+E)*S` for decode. These rates need conversion before comparison with useful throughput.
9. **Matrix-dependent erasure guarantees:** The sample uses `gf_gen_rs_matrix`, whose systematic construction has documented parameter limits for guaranteed recovery. Added that caveat, confirmed `10+4` satisfies the documented `k <= 21, parity = 4` condition, and identified the Cauchy generator as an alternative for suitable layouts.

## Review Notes
- Reviewed the shell snippets, fio INI settings, ISA-L argument parser, build targets, buffer-size restriction, erasure selection, decode setup placement, output denominators, and linked resources against upstream documentation and source. The benchmark binary path in the post matches the inspected Autotools build definitions.
- The supplied `-k 10 -p 4 -e 1/4 -s 1M` arguments are supported by the inspected source. Missing indexes are known to the decoder; these runs do not demonstrate unknown-error localization or correction. Matrix inversion and coefficient-table setup occur outside the timed decode kernel loop.
- The fio options are valid. `ramp_time` is additional lead-in time; `time_based` repeats the configured range. `direct=1` is not a general cache-flush or durability guarantee. `fsync_on_close` synchronizes dirty files on close and does not model per-stripe synchronous latency.
- Build and CLI details are revision dependent. `REVIEWED_RELEASE_OR_COMMIT` and the scratch mount are intentional placeholders. Readers must select a real revision and disposable filesystem, install platform-specific build prerequisites, and check that the chosen revision supports the illustrated options. The commands primarily target Linux; io_uring and the hardware inventory tools are not portable to every host.
- SHA-256 comparisons establish byte integrity against a trusted reference; plain hashes alone do not authenticate metadata. The article appropriately calls for authenticated per-shard digests and a manifest, leaving the production authentication mechanism to the application.
- Recovery concurrency, failure placement, foreground latency, sustained SSD behavior, and resource headroom require measurements on the intended deployment. `M+1`-erasure rejection belongs in the application wrapper; low-level ISA-L routines do not enforce a complete storage format or fail-closed policy.
- This was a documentation and source review. No ISA-L build, SSD write benchmark, recovery drill, or hardware performance measurement was executed. Validation does not assert that deployment acceptance gates have been met.
- Only technical corrections were made within the existing post structure. Both requested validation artifacts were created with the requested status and date.
