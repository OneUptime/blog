# Validation Summary: How to Understand Performance Tradeoffs of Erasure Coding in Ceph

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Ceph (erasure coding, replicated pools, OSD architecture)
- Rook (Ceph operator for Kubernetes)
- Erasure coding plugins: Jerasure, ISA-L (Intel Storage Acceleration Library)
- CephFS, RADOS Gateway (RGW)
- Kubernetes persistent storage

## Sources Consulted
- Ceph Erasure Code documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/erasure-code/
- Ceph Erasure Coding Direct Reads developer docs: https://docs.ceph.com/en/latest/dev/osd_internals/erasure_coding/direct_reads/
- Ceph Erasure Coding Enhancements: https://docs.ceph.com/en/latest/dev/osd_internals/erasure_coding/enhancements/
- Ceph Jerasure and ISA plugins benchmarks (2015): https://ceph.io/en/news/blog/2015/ceph-jerasure-and-isa-plugins-benchmarks/
- Ceph Erasure Coding overhead in a nutshell: https://ceph.io/en/news/blog/2015/ceph-erasure-coding-overhead-in-a-nutshell/
- New in Luminous: Erasure Coding for RBD and CephFS: https://ceph.io/en/news/blog/2017/new-luminous-erasure-coding-rbd-cephfs/
- Benchmarking the Ceph Object Gateway Part 2 (2025): https://ceph.io/en/news/blog/2025/benchmarking-object-part2/
- Fast Erasure Coding for Tentacle performance updates (2025): https://ceph.io/en/news/blog/2025/tentacle-fastec-performance-updates/
- Intel ISA-L GitHub repository: https://github.com/intel/isa-l

## Issues Found

### 1. Small random reads incorrectly listed as "Same or faster" in read performance table
**What was wrong:** The read performance table claimed EC small random reads were "Same or faster (4 OSDs in parallel)" compared to replicated reads. This directly contradicted the paragraph immediately below the table, which correctly states EC has higher latency for small objects because Ceph needs to contact more OSDs. Published Ceph benchmarks show replicated pools deliver 33-37% faster GETs for small objects compared to EC.

**What was changed:** Updated table entry from "Same or faster (4 OSDs in parallel)" to "Higher latency (k OSDs contacted)" to be consistent with the text and actual Ceph behavior.

### 2. ISA-L CPU reduction claim overstated
**What was wrong:** The post claimed ISA-L reduces CPU usage by "3-5x" via "SIMD acceleration." Published benchmarks (Ceph's own plugin benchmarks and academic papers like EC-Bench) consistently show ISA-L is approximately 2-3x faster than Jerasure, not 3-5x. Additionally, Jerasure 2.0+ also uses SIMD instructions (SSSE3, SSE4), so the advantage is from more aggressive optimization (hand-tuned AVX2/AVX-512 assembly), not from SIMD vs. no-SIMD.

**What was changed:** Updated "3-5x" to "roughly 2-3x" and changed "via SIMD acceleration" to "via optimized SIMD instructions (AVX2/AVX-512)" for accuracy.

## Review Notes
- The CPU overhead percentage figures (~15%/~12% for Jerasure, ~4%/~3% for ISA-L) are presented as approximate values but could not be traced to any specific published benchmark. They are in a plausible range given the ~2-3x performance gap, but readers should treat them as rough estimates that will vary significantly by hardware, workload, and Ceph version.
- The network overhead section presents 1.5 GiB for EC vs 3 GiB for replication. These figures accurately represent the total data written to storage (storage amplification factor), but actual total network wire traffic is higher when counting client-to-primary transfers (~2.25 GiB for EC, ~3 GiB for replication). The relative comparison and conclusion (EC uses less bandwidth) remains correct.
- The write latency claim of "3-5x higher" for small random writes is a plausible worst-case estimate but is not a precisely documented figure. Modern Ceph (Tentacle release and later) with FastEC parity delta writes significantly reduces this gap.
- The CephFS `allow_ec_overwrites` flag name is confirmed correct per official documentation.
- The workload decision matrix recommendations are sound and align with Ceph community best practices.
