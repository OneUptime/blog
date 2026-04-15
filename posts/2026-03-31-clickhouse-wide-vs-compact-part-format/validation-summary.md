# Validation Summary: How to Use Wide vs Compact Part Format in MergeTree

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse MergeTree engine
- ClickHouse part storage formats (Wide and Compact)
- ClickHouse system.parts table
- ClickHouse ALTER TABLE MODIFY SETTING syntax

## Sources Consulted
- ClickHouse official documentation on MergeTree data storage: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#mergetree-data-storage
- ClickHouse official documentation on system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse knowledge base article on wide vs compact format
- ClickHouse source code (MergeTreeSettings.cpp) for default values
- ClickHouse GitHub issue #14764 (maintainer Anton Popov confirming AND logic for thresholds)
- ClickHouse documentation on sparse primary indexes and mark file formats

## Issues Found

1. **Wide format mark file extension was wrong (.mrk3 -> .mrk2):** The blog listed `.mrk3` files in the wide format directory structure. Wide format uses `.mrk2` files (with adaptive index granularity, which is the default). The `.mrk3` extension is specific to compact format. Fixed all three column entries in the wide format file listing from `.mrk3` to `.mrk2`.

2. **Threshold logic was inverted (OR -> AND):** The blog stated "When either threshold is exceeded, the part is written in wide format" (OR logic). The actual behavior is that **both** `min_bytes_for_wide_part` and `min_rows_for_wide_part` must be exceeded (AND logic). If either is below threshold, compact format is used. Fixed the explanation and added a note clarifying that with `min_rows_for_wide_part = 0` (default), the row condition is always satisfied, so only the byte threshold is effective.

3. **Wide format listing was missing columns.txt:** The compact format listing included `columns.txt` but the wide format listing omitted it. Both formats include `columns.txt` in the part directory. Added it to the wide format listing.

4. **min_rows_for_wide_part = 0 described as "disabled":** Changed the comment from "0 = disabled by default" to "0 = always satisfied (row count is not a factor)" to more accurately describe the AND-logic behavior where 0 means the condition is trivially met, not that the setting is ignored.

## Review Notes
- The blog's description of "interleaved" compression in compact format is slightly imprecise — compact format stores columns consecutively within data.bin, not truly interleaved row-by-row. The compression difference is more about per-column codec application than interleaving. This is a minor wording nuance and was left as-is since the directional claim is correct.
- The file listings for both formats omit several metadata files common to all parts (count.txt, default_compression_codec.txt, partition.dat, minmax_*.idx). This is acceptable since the blog is illustrating the key structural difference, not providing an exhaustive listing.
- The default value for `min_bytes_for_wide_part` (10 MB) is correct for self-hosted ClickHouse. ClickHouse Cloud uses a different default (1 GB). The post does not mention this distinction, which is fine since it targets general ClickHouse usage.
