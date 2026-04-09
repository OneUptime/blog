# Validation Summary: How to Configure Hit Set Settings for Cache Tiering

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph cache tiering
- Bloom filters (probabilistic data structures)
- Rook (Ceph operator for Kubernetes, mentioned in tags)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph source code for HitSet implementation (src/os/bluestore/HitSet.h)
- Bloom filter theory and optimal sizing formulas (Wikipedia: Bloom filter)

## Issues Found

1. **Hit set types count was wrong**: Post stated Ceph supports "two" hit set types (bloom, explicit_hash). Ceph actually supports three: `bloom`, `explicit_hash`, and `explicit_object`. Added the missing `explicit_object` type to the list.

2. **False claim about default FPP value**: The comment on `hit_set_fpp 0.10` stated it was the "(default)". Ceph's default `hit_set_fpp` is 0.05, not 0.10. Removed the "(default)" label to avoid misleading readers.

3. **Promotion logic was incorrect**: The post described promotion as requiring an object to "appear in >= min_read_recency_for_promote hit sets." This is wrong. The actual behavior is: Ceph checks the last N hit sets (where N = `min_read_recency_for_promote`), and if the object is found in **any** of those hit sets, it is promoted. The object does not need to appear in all N. Fixed both the promotion logic diagram and the configuration comment.

4. **Memory calculation arithmetic error**: The Bloom filter formula was correct (`objects * 1.44 * log2(1/fpp) / 8`), but the numerical result was wrong. The post claimed ~2.6 MB per hit set and ~10.4 MB total for 1M objects with FPP=0.05 and 4 hit sets. The correct values are ~0.78 MB per hit set and ~3.1 MB total (verified mathematically). The error was approximately 3.4x too high.

## Review Notes
- Cache tiering is deprecated in newer Ceph releases (starting from Nautilus/Mimic era). The post does not mention this deprecation. While the technical content about hit sets and Bloom filters remains accurate for clusters still using cache tiering, readers should be aware that Ceph upstream recommends alternative approaches for new deployments.
- The post title and tags mention "Rook" but the content only covers native Ceph CLI commands, not Rook CRD configuration. This is acceptable since Rook ultimately configures the same underlying Ceph parameters.
- All `ceph osd pool set/get` commands use correct syntax and valid parameter names.
