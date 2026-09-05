# Validation Summary: How to Recover Missing Reed-Solomon Shards and Verify the Reconstructed File

## Status
validated

## Post Type
Tutorial / recovery guide

## Technologies Covered
- Reed-Solomon erasure coding and systematic data layouts
- Backblaze JavaReedSolomon
- Java arrays, streams, and NIO file APIs
- SHA-256 integrity verification and authenticated manifests
- Atomic file publication and filesystem durability

## Sources Consulted
- Backblaze repository: https://github.com/Backblaze/JavaReedSolomon
- Decoder and buffer validation implementation: https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomon.java
- Sample encoding format: https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/SampleEncoder.java
- Sample reassembly and header handling: https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/SampleDecoder.java
- Java Files API, including newOutputStream and move: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/Files.html
- Java Path API: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/Path.html
- Java FileChannel API and force durability guarantees: https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/channels/FileChannel.html
- RFC 5510, Reed-Solomon Forward Error Correction: https://www.rfc-editor.org/rfc/rfc5510.html
- Riley and Richardson, Reed-Solomon coding principles: https://www.cs.cmu.edu/~guyb/realworld/reedsolomon/reed_solomon_codes.html

## Issues Found
- The candidate output stream used default options, which truncate an existing file. Changed it to CREATE_NEW and WRITE so a previous candidate is preserved and an existing path causes failure. Added the Java I/O and NIO imports used by the snippets.
- Reassembly treated concatenated data shards as raw file bytes without stating the encoder layout. Clarified that the example assumes consecutive raw-file chunks and final padding; Backblaze's linked sample format requires skipping its four-byte length header and checking the header against the trusted length.
- The fallback for missing parity hashes did not explain how those shards could satisfy the verified-source requirement. Clarified that unauthenticated parity must be marked missing, only available expected hashes can be checked, and parity verification must return true. A consistent codeword does not authenticate its source.
- The atomic-publication instruction omitted the required Java move option and unsupported-provider behavior. Specified ATOMIC_MOVE and failure when atomic movement is unsupported.
- The illustrative manifest could be mistaken for a complete nine-shard manifest. Clarified that its digest strings are placeholders and a real manifest needs one digest for each indexed shard.

## Review Notes
- Reviewed the snippets against upstream source and official Java API documentation; no end-to-end Java recovery or crash-injection tests were executed. The snippets are application fragments, requiring an enclosing method, exception handling or declarations, and implementations of manifest and digest helpers.
- Confirmed create, decodeMissing, and isParityCorrect signatures, equal-sized destination buffers, in-place recovery of missing data and parity, and rejection when fewer than K sources are marked present. The presence bitmap remains unchanged by decodeMissing.
- The six-data/three-parity configuration is valid. Backblaze supports at most 256 total shards. A real application must bind the chosen K and M and the encoding layout to the authenticated manifest; a whole-file hash alone cannot prove every metadata field is correct.
- Path.of requires Java 11 or later. No deprecated API was identified in the examples. The post does not pin a Backblaze release; source review used upstream master as retrieved on the validation date.
- The JSON is syntactically valid illustrative metadata, not a library-defined configuration schema. Its originalLength fits within six shard buffers. Digest helpers must abort on mismatch before publication.
- Atomic visibility and durable storage are separate guarantees. Filesystem-specific flushing, journal persistence, directory-entry persistence, and coordination of competing publishers remain application responsibilities. ATOMIC_MOVE has implementation-specific behavior when the target already exists; the generation check must be coordinated with publication.
- The suggested corruption and loss tests are appropriate. Swapping distinct shard contents must fail per-index digest verification; swapping identical byte sequences is harmless and cannot be distinguished by their hashes.
- The linked Backblaze resources resolve to the intended repository and source files. There are no terminal commands to validate.
