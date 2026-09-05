# Validation Summary: How to Implement Reed-Solomon Encoding and Decoding in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java: byte arrays, ByteBuffer, integer bounds, and array copying.
- Backblaze JavaReedSolomon and GF(2^8) erasure coding.
- Gradle, Git, and GNU SHA-256 utilities.
- Authenticated manifests, integrity checking, immutable generations, and crash-safe storage publication.

## Sources Consulted
- [Official JavaReedSolomon repository](https://github.com/Backblaze/JavaReedSolomon), inspected at commit `d3c481dc69471e0c47ff6f67f33d53bde941675e` in a temporary clone.
- [ReedSolomon API implementation](https://github.com/Backblaze/JavaReedSolomon/blob/d3c481dc69471e0c47ff6f67f33d53bde941675e/src/main/java/com/backblaze/erasure/ReedSolomon.java).
- [SampleEncoder](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/SampleEncoder.java) and [SampleDecoder](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/SampleDecoder.java).
- [ReedSolomonBenchmark](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomonBenchmark.java), inspected in the official clone.
- [Gradle wrapper configuration](https://github.com/Backblaze/JavaReedSolomon/blob/master/gradle/wrapper/gradle-wrapper.properties) and [build.gradle](https://github.com/Backblaze/JavaReedSolomon/blob/master/build.gradle), inspected in the official clone.
- [Gradle Java compatibility matrix](https://docs.gradle.org/current/userguide/compatibility.html) and [Gradle 6-to-7 migration guide](https://docs.gradle.org/current/userguide/upgrading_version_6.html).
- Oracle Java API documentation: [ByteBuffer](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/ByteBuffer.html), [Arrays](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Arrays.html), and [Math](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Math.html).
- Official Git documentation: [git clone](https://git-scm.com/docs/git-clone) and [git checkout](https://git-scm.com/docs/git-checkout).
- Local GNU `sha256sum --help`, confirming file arguments and SHA-256 output.
- [Linux fsync(2) documentation](https://man7.org/linux/man-pages/man2/fsync.2.html), including directory-entry persistence requirements.
- [NIST FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final).

## Issues Found
1. **Missing build-tool compatibility prerequisite.** The repository uses Gradle 6.9.1, which does not support running on Java 17. Added a compatible build-JDK example (JDK 11), the requirement to set `JAVA_HOME`, and the need to migrate legacy `testCompile` when upgrading Gradle. Clarified that the reviewed commit placeholder must be replaced.
2. **Decoder placement was implicit.** The second Java block references constants and imports from `RsFiles` and is a class method. Clarified that it belongs inside the previously shown class so readers can assemble a compilable example.
3. **Atomic publication omitted explicit metadata durability.** An atomic pointer replacement alone does not ensure crash persistence. Updated the existing write-protocol steps to persist the manifest before publishing its pointer and to make the pointer update and relevant filesystem directory entries durable.

## Review Notes
- Compiled the official library sources and both blog Java blocks assembled into `RsFiles` using OpenJDK/javac 17.0.16. No changes to the Java algorithms were necessary.
- Executed 1,188 successful round trips: 18 input lengths, three input patterns (seeded random, repeating byte sequence, and zeros), and all 22 zero-, one-, and two-erasure masks. Included empty input and lengths around shard boundaries through 4,097 bytes. Compared both recovered object bytes and all reconstructed shards with their originals.
- Executed 2,268 expected failures covering every mask with three or more missing shards for those inputs. Also verified rejection of an incorrect expected length and inconsistent parity caused by modifying a present shard.
- Confirmed equal-size buffer requirements, allocation for missing shards, the four-survivor threshold, and the 256-total-shard source limit. The APIs used are present and are not marked deprecated.
- ByteBuffer defaults to big-endian order. Long intermediate arithmetic avoids overflow in encoded-size calculations. The implementation's padded-array check limits input to 2,147,483,640 bytes; practical heap limits are lower. The post's broader “smaller than 2 GiB” statement is correct.
- Parity checking establishes codeword consistency, while trusted digests identify the expected content. Manifest authentication, per-shard digest verification, and final object hashing are explicitly caller responsibilities; the snippets do not implement these operations.
- Reviewed the build commands against repository configuration and tool documentation, but did not execute the full Gradle test/JAR build under a compatible JDK. Direct compilation and the review harness passed under JDK 17. Upstream uses a dynamic JUnit `4.+` dependency, so source-commit pinning alone does not fully pin test dependencies.
- Storage crash drills, manifest tampering tests, backend checksum semantics, large-memory limits, and performance benchmarks were not executed; they require the application/storage integration omitted from these core methods.
- Official documentation links correspond to the named repository files; raw-web fetch failures for some files were resolved by reading the official Git clone. The benchmark covers encoding and parity checking; the post correctly calls for separate application measurements of decoding.
