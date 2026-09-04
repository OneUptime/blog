# How to Implement Reed-Solomon Encoding and Decoding in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Erasure Coding, Data Integrity, Recovery, Distributed Storage

Description: Implement a versioned Java Reed-Solomon file format, reconstruct missing shards safely, and verify parity and recovered bytes with trusted hashes.

---

Backblaze's JavaReedSolomon library provides a compact `GF(2^8)` codec with `encodeParity`, `decodeMissing`, and `isParityCorrect`. The codec can calculate bytes, but the application still owns the storage format: shard indexes, original length, hashes, atomic publication, and failure handling.

This walkthrough uses four data shards and two parity shards. Any two known missing shards can be reconstructed from four verified survivors. It is a tutorial layout, not a universal durability recommendation; choose `K` and `M` from measured failure domains and repair time.

## Build a Reviewed Library Revision

The official repository includes Gradle configuration, tests, sample encoder and decoder programs, and a benchmark. Pin a reviewed commit instead of building an unbounded branch:

```bash
git clone https://github.com/Backblaze/JavaReedSolomon.git
cd JavaReedSolomon
git checkout COMMIT_ID_REVIEWED_BY_YOUR_TEAM
./gradlew clean test jar
sha256sum build/libs/*.jar
```

Publish the resulting JAR to an internal artifact repository with its source commit, toolchain version, test result, and SHA-256 digest. Do not paste an arbitrary downloaded JAR into production.

## Encode the File and Its Length

The following core method follows the official `SampleEncoder` layout. It stores a four-byte big-endian file length, copies that byte stream across the data shards, calculates parity, and returns all six shards:

```java
import com.backblaze.erasure.ReedSolomon;

import java.nio.ByteBuffer;
import java.util.Arrays;

final class RsFiles {
    static final int DATA_SHARDS = 4;
    static final int PARITY_SHARDS = 2;
    static final int TOTAL_SHARDS = DATA_SHARDS + PARITY_SHARDS;
    static final int HEADER_BYTES = Integer.BYTES;

    static byte[][] encode(byte[] input) {
        long storedSize = (long) HEADER_BYTES + input.length;
        long shardSizeLong =
            (storedSize + DATA_SHARDS - 1L) / DATA_SHARDS;
        long paddedSizeLong = shardSizeLong * DATA_SHARDS;
        if (paddedSizeLong > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("input is too large for this format");
        }

        int shardSize = Math.toIntExact(shardSizeLong);
        byte[] allBytes = new byte[Math.toIntExact(paddedSizeLong)];
        ByteBuffer.wrap(allBytes).putInt(input.length).put(input);

        byte[][] shards = new byte[TOTAL_SHARDS][shardSize];
        for (int index = 0; index < DATA_SHARDS; index++) {
            System.arraycopy(
                allBytes, index * shardSize,
                shards[index], 0,
                shardSize
            );
        }

        ReedSolomon codec = ReedSolomon.create(DATA_SHARDS, PARITY_SHARDS);
        codec.encodeParity(shards, 0, shardSize);
        if (!codec.isParityCorrect(shards, 0, shardSize)) {
            throw new IllegalStateException("parity verification failed");
        }
        return shards;
    }

    private RsFiles() {}
}
```

Write each returned array under an immutable generation ID with its numeric index. All arrays must be exactly the same length. Record in an authenticated manifest:

- format and codec revision;
- `DATA_SHARDS`, `PARITY_SHARDS`, shard length, and original length;
- SHA-256 for each indexed shard;
- SHA-256 for the original object;
- generation ID and storage location for each shard.

The four-byte header limits this example to files smaller than 2 GiB. A production format can use an eight-byte length and stream fixed-size stripes rather than buffering an entire file. Version that change explicitly; silently altering the header makes old data undecodable.

## Decode Only Verified Shards

Before decoding, read the trusted manifest. Reject files with a wrong size or digest and mark their indexes absent. Never mark a zero-filled replacement buffer as present. This method reconstructs known erasures and returns the original bytes:

```java
static byte[] decode(
    byte[][] shards,
    boolean[] present,
    int expectedLength
) {
    if (shards.length != TOTAL_SHARDS || present.length != TOTAL_SHARDS) {
        throw new IllegalArgumentException("wrong shard count");
    }

    int shardSize = -1;
    int survivors = 0;
    for (int index = 0; index < TOTAL_SHARDS; index++) {
        if (!present[index]) continue;
        if (shards[index] == null) {
            throw new IllegalArgumentException("present shard is null");
        }
        if (shardSize < 0) shardSize = shards[index].length;
        if (shards[index].length != shardSize) {
            throw new IllegalArgumentException("shard sizes differ");
        }
        survivors++;
    }
    if (survivors < DATA_SHARDS || shardSize < 1) {
        throw new IllegalArgumentException("not enough verified shards");
    }

    for (int index = 0; index < TOTAL_SHARDS; index++) {
        if (!present[index]) shards[index] = new byte[shardSize];
    }

    ReedSolomon codec = ReedSolomon.create(DATA_SHARDS, PARITY_SHARDS);
    codec.decodeMissing(shards, present, 0, shardSize);
    if (!codec.isParityCorrect(shards, 0, shardSize)) {
        throw new IllegalStateException("reconstructed parity is inconsistent");
    }

    long dataSizeLong = (long) DATA_SHARDS * shardSize;
    if (dataSizeLong > Integer.MAX_VALUE) {
        throw new IllegalArgumentException("decoded data is too large");
    }
    byte[] allBytes = new byte[Math.toIntExact(dataSizeLong)];
    for (int index = 0; index < DATA_SHARDS; index++) {
        System.arraycopy(
            shards[index], 0,
            allBytes, index * shardSize,
            shardSize
        );
    }

    int originalLength = ByteBuffer.wrap(allBytes).getInt();
    if (originalLength < 0 ||
        originalLength != expectedLength ||
        originalLength > allBytes.length - HEADER_BYTES) {
        throw new IllegalArgumentException("invalid recovered length");
    }
    return Arrays.copyOfRange(
        allBytes,
        HEADER_BYTES,
        HEADER_BYTES + originalLength
    );
}
```

After `decode` returns, compare the SHA-256 of its result with the authenticated object digest. Parity consistency proves that the shards form a codeword; it does not prove that the codeword is the intended object. A trusted end-to-end digest supplies that identity check.

## Use a Recoverable Write Protocol

Do not update the live shard set one file at a time. That can mix generations after a crash. A safer sequence is:

1. Generate a new random generation ID.
2. Write every shard under that ID with create-only semantics.
3. Flush and verify every stored shard by reading it back or using storage checksums with defined semantics.
4. Write and authenticate an immutable manifest.
5. Atomically replace the small pointer to the current manifest.
6. Retain the previous generation until the new one passes a recovery drill and the rollback window expires.

During recovery, write reconstructed shards to new temporary paths, hash them, and rename or publish only after they match their manifest entries. Preserve suspect inputs for diagnosis. Never reconstruct directly over the sole surviving copy.

## Test Correctness and Failure Boundaries

For `4+2`, test at least these cases with random and patterned inputs, including empty input and lengths around shard boundaries:

```text
no loss                     should verify without changes
one data shard absent       should recover
one parity shard absent     should recover
two data shards absent      should recover
one data + one parity       should recover
three shards absent         must fail closed
one present shard modified  digest must reject it before decode
manifest modified           signature or MAC must reject it
```

Automate every two-shard combination, not just one convenient pair. For a test object, save its digest, encode, delete selected shard copies, decode, and compare every byte. Repeat after JVM and library upgrades. JavaReedSolomon supports at most 256 total shards in its current source, but operationally sensible layouts are normally far smaller.

Benchmark `encodeParity`, one-erasure decode, and two-erasure decode separately. The repository contains multiple coding-loop implementations and a benchmark because the fastest loop depends on CPU and buffer shape. Measure with your actual shard size and concurrency, and include storage I/O if the result will drive capacity planning.

## Conclusion

JavaReedSolomon supplies the finite-field operations, while a safe application supplies the format and recovery contract. Encode the original length, index equal-size shards, authenticate per-shard and whole-object digests, publish generations atomically, and classify bad shards as absent before `decodeMissing`. Only a tested loss matrix plus an end-to-end hash demonstrates recoverability.

## Official Documentation

- [Backblaze JavaReedSolomon repository](https://github.com/Backblaze/JavaReedSolomon)
- [ReedSolomon Java API source](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomon.java)
- [Official SampleEncoder source](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/SampleEncoder.java)
- [Official SampleDecoder source](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/SampleDecoder.java)
- [Official ReedSolomonBenchmark source](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomonBenchmark.java)
