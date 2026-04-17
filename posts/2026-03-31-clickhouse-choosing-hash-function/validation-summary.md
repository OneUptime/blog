# Validation Summary: How to Choose the Right Hash Function in ClickHouse

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- ClickHouse SQL
- ClickHouse hash functions (cityHash64, xxHash64, intHash32/64, sipHash64/sipHash64Keyed, sipHash128, MD5, SHA1, SHA256, halfMD5, javaHash, hiveHash, murmurHash2_*/murmurHash3_*, farmHash64, metroHash64, URLHash, wordShingleMinHash, wordShingleSimHash)

## Sources Consulted
- Official ClickHouse Hash Functions reference: https://clickhouse.com/docs/sql-reference/functions/hash-functions
- ClickHouse documentation on SipHash and SipHashKeyed variants

## Issues Found
1. The post stated "ClickHouse hash functions fall into five categories" but then listed eight categories (1–8). Changed the sentence to "ClickHouse hash functions fall into the following categories:" to remove the incorrect count.
2. The post claimed `xxHash64` is unconditionally "the fastest option for hashing a single string value". Performance vs. `cityHash64` is workload-dependent (and not stated in the official ClickHouse docs). Softened the language and added a recommendation to benchmark.
3. The post recommended `sipHash64` for hash-flooding protection. In ClickHouse, `sipHash64` uses a fixed, publicly-known key, which does not provide true protection against an adversary. Updated the Decision Matrix row, the section heading, body text, example SQL (now using `sipHash64Keyed((k0, k1), ...)`), and the summary to recommend `sipHash64Keyed` with a secret runtime-chosen key for adversarial input.

## Review Notes
- All function names referenced in the post (cityHash64, farmHash64, metroHash64, xxHash32, xxHash64, intHash32, intHash64, sipHash64, sipHash128, MD5, SHA1, SHA256, javaHash, hiveHash, halfMD5, wordShingleMinHash, wordShingleSimHash, murmurHash2_32/64, murmurHash3_32/128, URLHash) exist in ClickHouse and are spelled correctly.
- ClickHouse also exposes newer/adjacent functions not mentioned in the post (e.g., `xxh3`, `xxh3_128`, `farmFingerprint64`, `murmurHash3_64`, `sipHash128Reference`, `sipHash128ReferenceKeyed`, BLAKE3, RIPEMD160). The post is not wrong to omit them — it is a curated guide — but a future revision could add a short note about `xxh3` for readers chasing maximum throughput and `farmFingerprint64` as the deterministic/stable sibling of `farmHash64`.
- The anti-pattern about not string-converting integers before hashing is accurate: `intHash32`/`intHash64` take integer input directly and are faster than string-based hashes on integer columns.
