# Validation Summary: How to Detect Which Reed-Solomon Shards Are Corrupt Before Decoding

## Status
validated

## Post Type
Technical guide with Bash commands, Java API examples, and recovery pseudocode.

## Technologies Covered
- Reed-Solomon error correction and erasure coding
- Backblaze JavaReedSolomon and Java
- SHA-256, authenticated manifests, MACs, and digital signatures
- GNU Coreutils `sha256sum` and Bash
- Intel ISA-L erasure coding
- PAR 2.0 slice integrity metadata

## Sources Consulted
- Backblaze JavaReedSolomon project: https://github.com/Backblaze/JavaReedSolomon
- Backblaze implementation, including `create`, `isParityCorrect`, `decodeMissing`, and buffer validation: https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomon.java
- Intel ISA-L function overview: https://github.com/intel/isa-l/blob/master/doc/functions.md
- PAR 2.0 specification, including slice checksums and replicated metadata: https://parchive.github.io/doc/Parity%20Volume%20Set%20Specification%20v2.0.html
- GNU Coreutils installed `sha256sum --help`: verified file-list input, checksum output, and `-c`/`--check` semantics. Online manual requests failed; local official help was used instead. Documentation entry point: https://www.gnu.org/software/coreutils/sha256sum
- NIST HMAC definition: https://csrc.nist.gov/glossary/term/Hash_Based_Message_Authentication_Code
- Reedsolo maintainer documentation, including the mixed error/erasure bound and possible undetected miscorrection beyond it: https://github.com/tomerfiliba-org/reedsolomon/blob/master/README.rst
- CMU-hosted Reed-Solomon introduction, for error versus erasure correction and syndrome decoding: https://www.cs.cmu.edu/~realworld/reedsolomon/reed_solomon_codes.html

## Issues Found
1. The checksum-generation introduction did not require existing files to be known intact and called the output a manifest even though it lacks encoding metadata and authentication. Clarified the baseline prerequisite and the additional metadata/authentication requirements; newly computed hashes cannot reveal pre-existing corruption.
2. The parity discussion listed length problems as a possible cause of a `false` result. Corrected this to distinguish parity mismatch from `IllegalArgumentException` for unequal buffers or an invalid byte range, as implemented by Backblaze.
3. The mixed correction bound did not define its units. Defined `E` and `S` as symbol errors and erasures per codeword; the bound is not a count of arbitrary byte errors across an entire object.
4. The conclusion generalized the limitation of an erasure-only decoder to Reed-Solomon parity itself. Scoped the statement to the erasure-only decoder and its parity check, preserving the distinction from decoders capable of locating unknown errors.

## Review Notes
- The Java fragments use existing, non-deprecated methods in the inspected source. They assume the surrounding application supplies the import, counts, arrays, authenticated metadata, and hash classification. They are illustrative fragments, not standalone Java programs; no Java compilation or recovery harness was run.
- Verified that the decoder requires allocated, equally sized buffers at absent indexes and at least `K` present shards. Its bitmap controls reconstruction; it does not authenticate inputs, and it returns immediately when all shards are marked present.
- The two preflight budget checks are equivalent when the expected shard count is `K + M`; the redundancy is harmless. Authentication of the manifest must precede this pseudocode, as required by the surrounding text.
- Manifest durability, independent replication, preservation of damaged inputs, and checking both reconstructed shards and the original-length object are sound recovery requirements. Decode must consume the same bytes that passed integrity verification.
- PAR 2.0 uses CRC32 and MD5 for slice checksums; that reference illustrates localization and metadata layout, not cryptographic authentication of the proposed manifest.
- Backblaze and Intel links track mutable `master` branches. No release-specific claims or deprecated APIs required a version update. All four technical reference links resolved to their intended resources.
- The prescribed corruption tests are appropriate acceptance criteria for an implementation; they were reviewed, not executed as a complete detector test suite.
