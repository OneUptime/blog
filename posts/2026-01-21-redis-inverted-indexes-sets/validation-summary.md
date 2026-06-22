# Validation Summary: How to Build Inverted Indexes with Redis Sets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Sets
- Redis Hashes
- Redis Pipelines
- Redis Geospatial commands
- redis-py
- Python

## Sources Consulted
- Redis set data type documentation: https://redis.io/docs/latest/develop/data-types/sets/
- Redis `GEOADD` command documentation: https://redis.io/docs/latest/commands/geoadd/
- Redis `SCAN` / `SSCAN` command documentation: https://redis.io/docs/latest/commands/scan/
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The basic inverted-index example imported `json` but did not use it. Removed the unused import.
- `InvertedIndex.add()` always called `SADD` for the item tag set, even when `tags` was empty. Redis `SADD` requires at least one member, so the code now only calls `sadd()` when there are tags.
- `InvertedIndex.update_tags()` converted `new_tags` to a set but then used the original `new_tags` iterable when writing the updated item tag set. It now writes `new_tags_set`, which is safer for non-list iterables and matches the set-difference logic.
- Re-indexing an existing product with `ProductIndex.index_product()` left stale product IDs in old attribute sets. The method now removes existing product index entries before adding the new product data and attributes.
- Temporary keys for OR filters used `id(values)`, which is only process-local and can be reused. Replaced it with `uuid.uuid4().hex` to avoid accidental key collisions.
- Facet and suggestion examples used Redis `KEYS`, which can block on large keyspaces. Replaced those calls with `scan_iter()`, consistent with Redis guidance to use incremental scanning in production-oriented examples.
- The text-search example imported `Counter` and computed `word_counts` without using either. Removed the unused code.
- The suggestion example sliced keys before sorting by count, which could omit higher-count suggestions. It now scans matching keys, sorts by count, and applies the limit after sorting.
- `GeoIndex.add_location()` treated `attributes` as optional but only stored item data inside the `if attributes` branch. Locations without attributes would be found by `GEOSEARCH` but filtered out when fetching data. The code now stores latitude and longitude for every location.
- The geospatial usage comment said "within 5km" but passed a radius of `10`. Updated the radius to `5` so the code matches the text.

## Review Notes
- The examples are technically valid for standalone Redis deployments. In Redis Cluster, multi-key operations such as `SINTER` and `SUNIONSTORE` require all participating keys to be in the same hash slot, so production cluster deployments should use hash tags in key names.
- The examples use Redis sets for simple filtering and educational full-text search. For advanced search behavior such as stemming, fuzzy matching, phrase queries, and ranked scoring, Redis Query Engine / Redis Search or a dedicated search engine remains more appropriate.
