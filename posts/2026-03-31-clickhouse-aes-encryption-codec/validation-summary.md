# Validation Summary: How to Use AES Encryption Codec in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (column-level encryption codecs)
- AES-128-GCM-SIV and AES-256-GCM-SIV (RFC 8452)
- MergeTree engine
- ClickHouse server XML configuration (`encryption_codecs`)
- LZ4 and ZSTD compression codecs
- `OPTIMIZE ... FINAL`, `ALTER TABLE ... MODIFY COLUMN`
- `system.columns` metadata table

## Sources Consulted
- [ClickHouse docs — CREATE TABLE / Column Compression Codecs](https://clickhouse.com/docs/sql-reference/statements/create/table)
- [ClickHouse docs — Server configuration parameters (encryption_codecs)](https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- [Arenadata ADQM docs — How to use encryption codecs](https://docs.arenadata.io/en/ADQM/current/how-to/data-encryption/encryption-codecs.html)
- [ClickHouse PR #19896 — Add AES_128_GCM_SIV codec for encrypting columns on disk](https://github.com/ClickHouse/ClickHouse/pull/19896)
- [Altinity KB — ClickHouse data/disk encryption at rest](https://kb.altinity.com/altinity-kb-setup-and-maintenance/disk_encryption/)
- [ClickHouse docs — Compression in ClickHouse (system.columns.compression_codec)](https://clickhouse.com/docs/data-compression/compression-in-clickhouse)
- RFC 8452 — AES-GCM-SIV: Nonce Misuse-Resistant Authenticated Encryption

## Issues Found

1. **Incorrect codec order for encryption + compression (major).**
   - The post originally wrote `CODEC(AES_256_GCM_SIV, LZ4)` and `CODEC(AES_256_GCM_SIV, ZSTD(3))` and claimed "encryption must be the innermost transform."
   - ClickHouse applies codecs left-to-right on write. The official docs state encryption codecs should appear **last** in the chain (outermost) because encrypted data has high entropy and cannot be compressed. The documented example is `CODEC(Delta, LZ4, AES_128_GCM_SIV)`.
   - Fixed the two CREATE TABLE examples to `CODEC(LZ4, AES_256_GCM_SIV)` and `CODEC(ZSTD(3), AES_256_GCM_SIV)` and rewrote the surrounding explanation so it correctly states that compression runs first and encryption last (outermost), which is the supported ordering.

2. **Incorrect Mermaid flowchart.**
   - The original pipeline showed Plaintext → Encrypt → Compress → Disk (and the mirror on read), which contradicts how codecs actually run.
   - Updated to Plaintext → Compress → Encrypt → Disk, with decryption then decompression on read.

3. **Overstated PCI-DSS requirement.**
   - The inline comment `-- PCI-DSS requires 256-bit` is inaccurate. PCI-DSS v4 requires "strong cryptography," which accepts AES with keys of 128 bits or higher; 256-bit is not a hard requirement.
   - Replaced the comment with a neutral phrasing ("256-bit for a wider safety margin") that does not misstate regulatory requirements.

## Review Notes

- The XML configuration snippets (`<encryption_codecs>`, `<aes_128_gcm_siv>`, `<aes_256_gcm_siv>`, `<key_hex>`, `<key>`, `id` attribute on `<key_hex>`, `<current_key_id>`) match the ClickHouse documentation and were left unchanged. Keys may also be loaded indirectly via `from_env` or `from_zk` attributes, but the post does not need to mention those to be correct.
- The claim that `AES_128_GCM_SIV` and `AES_256_GCM_SIV` provide authenticated encryption and some nonce-misuse resistance is accurate per RFC 8452. Note that the ClickHouse implementation uses a fixed nonce (deterministic encryption), which is a known trade-off; the post does not go into this detail but nothing it says contradicts it.
- `system.columns.compression_codec` is a valid column and the query is correct.
- `OPTIMIZE TABLE ... FINAL` will eventually rewrite parts with the new codec by merging them into a single part; this is correct but can be expensive on large tables.
- The phrase "bypassing any compression-level skipping" in the Performance Considerations section is slightly imprecise (data skipping in ClickHouse is provided by skip indexes, not compression). Left as-is because the underlying point about having to decrypt an entire block to evaluate predicates is accurate.
- The generic warning about AES-NI overhead (~5%) is a ballpark figure; real numbers vary by workload, hardware, and codec chain. The post correctly presents it as typical rather than guaranteed.
