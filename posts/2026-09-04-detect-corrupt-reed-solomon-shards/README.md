# How to Detect Which Reed-Solomon Shards Are Corrupt Before Decoding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Erasure Coding, Data Integrity, Distributed Storage, Recovery, Checksum

Description: Locate corrupt Reed-Solomon shards with authenticated per-shard digests, convert known corruption into erasures, and verify every reconstruction end to end.

---

A storage-oriented Reed-Solomon decoder usually reconstructs **known missing shards**. It does not discover which apparently present shard contains bad bytes. For example, Backblaze's Java implementation accepts a `shardPresent[]` bitmap in `decodeMissing`; the caller must decide which inputs are trustworthy.

Add integrity metadata when encoding. On recovery, recompute each shard digest, mark mismatches as absent, and decode only from verified inputs. This converts an unknown error, which generally consumes two parity symbols, into a known erasure, which consumes one.

## Store a Manifest Alongside the Encoding Parameters

For each object or stripe group, preserve:

- codec and implementation version;
- data count `K` and parity count `M`;
- shard size and original byte length;
- stable shard index and storage location;
- SHA-256 or a keyed authentication tag for every shard;
- SHA-256 for the reassembled original object.

The manifest must not have the same single failure as the shards. Replicate it, place it in a strongly consistent metadata service, and authenticate it. If an attacker can replace a shard and its unauthenticated digest, SHA-256 alone does not establish provenance; sign the manifest or use a MAC under a separately protected key.

Generate a simple checksum list for existing shard files that are already known to be intact; hashing damaged files would record their corruption as the baseline. This list still needs authentication and the encoding metadata described above:

```bash
sha256sum shard-00.bin shard-01.bin shard-02.bin \
  shard-03.bin shard-04.bin shard-05.bin \
  shard-06.bin shard-07.bin shard-08.bin \
  >shards.sha256

sha256sum -c shards.sha256
```

For production, write the manifest atomically only after all shard writes have completed and been durably acknowledged. Include indexes in metadata rather than trusting filenames alone.

## Classify Every Shard Before Decode

Use three states:

```text
verified present  digest matches trusted manifest
known erasure     missing, unreadable, wrong length, or digest mismatch
unknown           manifest unavailable or cannot be authenticated
```

Only `verified present` should be a decode source. A zero-filled buffer is not present data. Allocate a correctly sized zero buffer for a missing destination, but mark it absent in the decoder bitmap.

The preflight algorithm is:

```text
for each expected shard index:
    if file is absent or unreadable:
        present[index] = false
    else if length differs from manifest:
        quarantine file; present[index] = false
    else if SHA-256 differs from manifest:
        quarantine file; present[index] = false
    else:
        present[index] = true

if count(present) < K:
    stop; obtain another intact shard or replica
if count(absent) > M:
    stop; this erasure set cannot reconstruct safely
```

Preserve bad inputs read-only. They may contain usable ranges for a more specialized forensic recovery, and overwriting them destroys evidence.

## Understand What a Parity Check Proves

Backblaze JavaReedSolomon provides `isParityCorrect(shards, offset, byteCount)`. It recomputes parity from the data shards and compares the supplied parity shards.

```java
ReedSolomon codec = ReedSolomon.create(dataShards, parityShards);
boolean consistent = codec.isParityCorrect(shards, 0, shardSize);
```

A `true` result is a useful consistency check when the data and parity arrays are in the expected order. A `false` result proves that something is inconsistent, but it does **not** identify the bad member. The error could be in a data shard, a parity shard, an index mapping, or the encoding parameters. Unequal buffer lengths or an out-of-bounds byte range cause `IllegalArgumentException` instead of a `false` result.

Do not remove random shards until the parity equation happens to pass. With enough parity and a small candidate set, combinatorial diagnosis is possible, but an unauthenticated parity match is not a substitute for stored per-shard digests and can select the wrong codeword.

## Decode Only the Known Erasures

After hash classification, allocate buffers for absent indexes and call the erasure decoder:

```java
int missing = 0;
for (int i = 0; i < totalShards; i++) {
    if (!shardPresent[i]) {
        shards[i] = new byte[shardSize];
        missing++;
    }
}

if (missing > parityShards) {
    throw new IllegalStateException("not enough verified shards");
}

codec.decodeMissing(shards, shardPresent, 0, shardSize);
```

Hash every reconstructed shard and compare it with its expected digest. Then reassemble exactly the original byte length and compare the whole-object digest. Do not publish the result or overwrite a source until both checks pass.

## Handle Missing Integrity Metadata Safely

If no trusted per-shard hashes exist, a parity mismatch cannot reliably name the corrupt shard. Safer options are:

1. retrieve another replica and compare each shard index;
2. use storage-device or transport checksums that are themselves authenticated and mapped to exact shard ranges;
3. use a decoder explicitly designed for unknown errors, with enough parity for the `2E + S <= M` bound, where `E` counts unknown symbol errors and `S` counts known symbol erasures in each codeword;
4. stop and preserve all candidates when the correction result cannot be verified externally.

An erasure-only API should never be told that an unverified shard is healthy. Silent corruption can then produce a plausible but wrong file.

## Test the Detector

Build automated tests that flip one byte in every shard index, truncate each shard, swap two shard names, remove up to `M` shards, and exceed `M` deliberately. Every within-budget case should reconstruct the original digest; every beyond-budget or wrong-configuration case should fail closed.

Also test a corrupted manifest and wrong `K`, `M`, or shard size. Metadata is part of the codeword's recoverability.

## Conclusion

An erasure-only Reed-Solomon decoder repairs data after the caller identifies trustworthy inputs; its parity check is not a shard-localization oracle. Store authenticated per-shard hashes and encoding metadata, classify every mismatch as an erasure, and refuse to decode without at least `K` verified sources. Verify reconstructed shards and the complete object before committing recovery.

## Official Documentation

- [Backblaze: JavaReedSolomon](https://github.com/Backblaze/JavaReedSolomon)
- [Backblaze: ReedSolomon.java Source](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomon.java)
- [Intel ISA-L: Erasure Code Function Overview](https://github.com/intel/isa-l/blob/master/doc/functions.md)
- [Parchive: PAR 2.0 Slice Checksum Specification](https://parchive.github.io/doc/Parity%20Volume%20Set%20Specification%20v2.0.html)
