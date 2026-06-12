# Validation Summary: How to Create Backup Deduplication

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Backup deduplication
- Content-defined chunking and rolling hashes
- Python
- xxHash
- BLAKE3, SHA-256, SHA-1, and MD5 hashing
- Bloom filters
- Python `concurrent.futures`, `functools`, `dataclasses`, `zlib`, and `tempfile`
- Python `cryptography` AES-CTR primitives
- Convergent encryption concepts

## Sources Consulted
- Python `functools.lru_cache` documentation: https://docs.python.org/3/library/functools.html
- Python `concurrent.futures.ThreadPoolExecutor` documentation: https://docs.python.org/3/library/concurrent.futures.html
- Python `dataclasses` documentation: https://docs.python.org/3/library/dataclasses.html
- Python `tempfile` documentation: https://docs.python.org/3/library/tempfile.html
- Python `zlib` documentation: https://docs.python.org/3/library/zlib.html
- `cryptography` symmetric encryption documentation: https://cryptography.io/en/latest/hazmat/primitives/symmetric-encryption/
- python-xxhash package documentation: https://pypi.org/project/xxhash/
- xxHash project documentation: https://xxhash.com/
- pybloom-live package documentation: https://pypi.org/project/pybloom-live/
- RFC 1321, The MD5 Message-Digest Algorithm: https://www.ietf.org/rfc/rfc1321.txt
- NIST SHA-1 retirement guidance: https://www.nist.gov/news-events/news/2022/12/nist-retires-sha-1-cryptographic-algorithm
- BLAKE3 specification draft: https://www.ietf.org/archive/id/draft-aumasson-blake3-00.html
- FastCDC paper, USENIX ATC 2016: https://www.usenix.org/system/files/conference/atc16/atc16-paper-xia.pdf

## Issues Found
- The variable-length chunking section described the sample implementation as Rabin fingerprinting, but the code was a simplified rolling hash and not a Rabin fingerprint. I changed the wording to say production systems commonly use Rabin fingerprinting, FastCDC, or similar techniques, renamed the function to `content_defined_chunk`, and updated call sites.
- The original rolling hash used only the low bit of each byte and did not remove outgoing window bytes correctly. I replaced it with a simple polynomial rolling-hash example that preserves the intended content-defined boundary behavior.
- The complete `DedupBackup` example used `xxhash` without importing it and imported an unused `Iterator`. I added `import xxhash` and removed the unused import.
- The threaded backup example shared one mutable `DedupBackup` instance, while `backup_file` updated the index without synchronization. I added a `Lock` and guarded index updates and chunk writes.
- The hash table text implied MD5 and SHA-1 were broadly fine for deduplication. I narrowed that to non-adversarial use and recommended verification or stronger hashes when adversarial input is possible.
- `ChunkStore.stats()` reported a chunk-count ratio rather than a byte-based deduplication ratio. I changed it to compute logical bytes divided by stored bytes.
- `source_side_backup_with_global_dedup()` used `xxhash` without importing it and referenced the renamed chunking function. I added the import and updated the function call.
- Several standalone snippets depended on earlier imports. I added missing imports for `xxhash`, `os`, `json`, and `dataclass` where needed.
- `store_chunk_compressed()` returned on duplicate chunks without incrementing the reference count. I fixed it to increment references before returning.
- The encryption section described convergent encryption too broadly as a secure multi-tenant option. I added the equality-leakage caveat and mentioned proof-of-ownership and key-management controls.
- The convergent encryption code used `default_backend()` and an MD5-derived IV. I updated it to the current `Cipher(algorithm, mode)` API and derived a 16-byte AES-CTR nonce with SHA-256 domain separation.
- `verify_backup_integrity()` wrote to a `NamedTemporaryFile` path while the file handle was still open, which is not portable across platforms. I changed it to use `tempfile.mkstemp()`, close the descriptor, restore to the path, compare, and clean up in `finally`.

## Review Notes
The Python snippets were syntax-checked after edits, and the edited content-defined chunking and AES-CTR examples were runtime-checked locally. Optional third-party packages `xxhash` and `pybloom_live` were not installed in the local environment, so their APIs were verified against package/project documentation instead.
