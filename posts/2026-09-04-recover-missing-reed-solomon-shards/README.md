# How to Recover Missing Reed-Solomon Shards and Verify the Reconstructed File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Erasure Coding, Recovery, Data Integrity, Java, Fault Tolerance

Description: Reconstruct known missing Reed-Solomon shards with the Backblaze Java library, preserve damaged evidence, and publish a file only after cryptographic verification.

---

A systematic `K+M` Reed-Solomon layout stores `K` data shards and `M` parity shards. Any `K` correctly indexed, equal-sized shards are sufficient to recover the missing members. Recovery fails safely when fewer than `K` trustworthy shards remain.

The difficult parts are outside the matrix operation: authenticating sources, retaining the original length, preserving shard order, and refusing to overwrite evidence before the reconstructed object passes an independent digest.

## Require a Trusted Manifest

The manifest for one encoded object should contain (digest values are placeholders; supply one SHA-256 digest per shard in index order):

```json
{
  "dataShards": 6,
  "parityShards": 3,
  "shardSize": 1048584,
  "originalLength": 6291456,
  "objectSha256": "trusted digest here",
  "shardSha256": ["digest 0", "digest 1", "..."]
}
```

Authenticate or sign this metadata and store redundant copies outside the shard failure domain. An index, field parameters, or original length that is wrong can yield a wrong file even when the decoder returns normally.

Copy all surviving shards into a read-only recovery workspace. Hash them there, quarantine mismatches, and never repair in place against the only copies.

## Build the Presence Bitmap

The Backblaze API requires all shard buffers to have the same length. Present buffers contain verified bytes; missing destinations are allocated as zero-filled buffers and marked `false`:

```java
import com.backblaze.erasure.ReedSolomon;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

int dataShards = 6;
int parityShards = 3;
int totalShards = dataShards + parityShards;

byte[][] shards = new byte[totalShards][];
boolean[] present = new boolean[totalShards];

// Load only files whose length and SHA-256 match the manifest.
for (int i = 0; i < totalShards; i++) {
    byte[] verified = loadAndVerifyShard(i); // null means absent or invalid
    if (verified != null) {
        shards[i] = verified;
        present[i] = true;
    }
}

int shardSize = expectedShardSizeFromManifest();
int presentCount = 0;
for (int i = 0; i < totalShards; i++) {
    if (present[i]) {
        if (shards[i].length != shardSize) {
            throw new IllegalStateException("wrong shard length at " + i);
        }
        presentCount++;
    } else {
        shards[i] = new byte[shardSize];
    }
}

if (presentCount < dataShards) {
    throw new IllegalStateException("need at least K verified shards");
}
```

`loadAndVerifyShard` represents application code that reads a stable index and compares SHA-256 with the trusted manifest. Do not mark a file present merely because it exists.

## Reconstruct Missing Members

Call `decodeMissing` across the intended byte range:

```java
ReedSolomon codec = ReedSolomon.create(dataShards, parityShards);
codec.decodeMissing(shards, present, 0, shardSize);
```

The method reconstructs missing data and parity buffers in place. Backblaze's implementation validates the array count, equal shard lengths, offset, and byte count. It cannot validate your mapping between shard index and physical file.

Immediately hash reconstructed members:

```java
for (int i = 0; i < totalShards; i++) {
    verifySha256(shards[i], expectedShardDigest(i));
}
```

If the original format did not preserve expected parity-shard hashes, mark those parity shards missing unless another trusted mechanism authenticates them. Verify the available expected shard hashes, require `codec.isParityCorrect(shards, 0, shardSize)` to return `true` after recovery, and rely on the whole-object digest for end-to-end confirmation. Parity consistency alone does not authenticate a source shard.

## Reassemble the Exact File Length

This example assumes the encoder split the raw file into consecutive data shards with padding only at the end. Concatenate those shards in index order. Backblaze's `SampleEncoder` instead prepends a four-byte length header; for that format, skip the header and validate its length against the trusted manifest before extracting the file. Remove padding using the authenticated original length, never by stripping trailing zero bytes because zero may be legitimate data:

```java
long originalLength = expectedOriginalLengthFromManifest();
if (originalLength < 0 ||
    originalLength > (long) dataShards * shardSize) {
    throw new IllegalStateException("invalid original length");
}

Path candidate = Path.of("recovered.bin.candidate");
try (OutputStream out = Files.newOutputStream(
        candidate, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
    long remaining = originalLength;
    for (int i = 0; i < dataShards && remaining > 0; i++) {
        int count = (int) Math.min(remaining, shardSize);
        out.write(shards[i], 0, count);
        remaining -= count;
    }
}

verifyFileSha256(candidate, expectedObjectDigest());
```

Write to a new candidate path on the same filesystem as the intended final file. After the digest, format checks, and application checks pass, atomically rename the candidate using `Files.move` with `StandardCopyOption.ATOMIC_MOVE`; fail closed if the provider does not support an atomic move. Keep the original shards and recovery log through the rollback period.

Make the publication step survive interruption as well as logical corruption. Flush the completed candidate according to the filesystem's durability contract, retain a recovery journal containing the manifest ID and chosen source indexes, and never reuse a partial candidate after restart without hashing it again. If the final name already exists, compare its trusted generation ID instead of overwriting it blindly. Test a forced process exit after each write, flush, verification, and rename boundary; every restart should select either the previous verified generation or the complete recovered generation, never a mixture.

## Test Every Failure Pattern You Claim to Support

For `K=6`, `M=3`, test at least:

- each single data shard missing;
- each single parity shard missing;
- three missing data shards;
- a mixture of data and parity losses totaling three;
- four missing shards, which must fail;
- a present shard with a wrong digest, treated as missing;
- two shard files swapped, which the manifest must catch;
- a wrong original length and wrong `K+M`, which must fail closed.

Generate deterministic input, record its SHA-256, encode, copy the shard set, and damage only the copy. A passing test requires the recovered object digest to equal the input digest, not merely that `decodeMissing` returned.

## Know the Limit

This workflow handles erasures: positions known missing or invalid. An unknown corrupted shard incorrectly included as a source is an **error** and generally costs twice as much parity to correct with an error-capable decoder. Backblaze JavaReedSolomon is an erasure-oriented API; detect corruption with hashes before calling it.

Reed-Solomon recovery also does not replace backups. Losing more than `M` members, losing the manifest, deleting all copies, or accepting maliciously replaced metadata can make the object unrecoverable.

## Conclusion

Recover in a separate workspace from at least `K` hash-verified, correctly indexed shards. Allocate absent buffers, let the decoder reconstruct them, validate every recovered member, and reassemble only the authenticated original length. Publish a candidate atomically only after its whole-file digest matches the external source of truth.

## Official Documentation

- [Backblaze: JavaReedSolomon](https://github.com/Backblaze/JavaReedSolomon)
- [Backblaze: SampleEncoder.java](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/SampleEncoder.java)
- [Backblaze: SampleDecoder.java](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/SampleDecoder.java)
- [Backblaze: ReedSolomon.java](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomon.java)
