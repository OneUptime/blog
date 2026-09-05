# Validation Summary: How to Calculate the Reed-Solomon Error-and-Erasure Correction Limit

## Status
validated

## Post Type
Technical guide with a JavaScript correction-budget helper.

## Technologies Covered
- Reed-Solomon codes, minimum distance, and mixed error-and-erasure decoding
- Finite fields and symbol-based storage erasure coding
- JavaScript Number validation and arithmetic
- Backblaze JavaReedSolomon and EZPWD Reed-Solomon
- Authenticated integrity checks and distributed-storage recovery

## Sources Consulted
- EZPWD Reed-Solomon API: https://github.com/pjkundert/ezpwd-reed-solomon — symbol sizes, shortening, and error/erasure parity costs.
- Backblaze implementation: https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomon.java — 256-shard limit, byte coding, systematic matrix construction, and decodeMissing behavior.
- Backblaze repository: https://github.com/Backblaze/JavaReedSolomon
- Microsoft Research, A Reed-Solomon Code for Disk Storage: https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/wdas.pdf — distance requirements, systematic construction, and finite-field matrix limits.
- USENIX FAST 2008, The RAID-6 Liberation Codes: https://www.usenix.org/legacy/events/fast08/tech/full_papers/plank/plank.pdf — storage word layout, erasure coding, and latent failures during recovery.
- Carnegie Mellon coding-theory lecture notes: https://www.cs.cmu.edu/~venkatg/teaching/codingtheory/notes/notes6.pdf — Reed-Solomon distance and the Singleton bound.
- ECMAScript specification: https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isinteger and https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.issafeinteger — integer validation and exact-integer limits.
- Author profile link: https://github.com/nawazdhandala — verified the original www.github.com URL redirects to the intended profile.

## Issues Found
1. The opening described separate data and parity symbols for a conventional RS code without specifying systematic encoding. Changed “conventional” to “systematic”; nonsystematic encoding need not preserve the original data symbols in the codeword.
2. The mixed correction guarantee did not explicitly require a capable decoder or disjoint error and erasure counts. Clarified that errors are counted outside erased positions and that Backblaze’s erasure-only decoder requires bad positions to be identified first.
3. The maximum-errors formula omitted its domain. Specified 0 <= S <= P; beyond that range, even zero errors cannot be guaranteed recoverable.
4. The shard paragraph applied a byte-offset codeword description without qualifying symbol width. Limited that description to 8-bit symbols.
5. Number.isInteger accepted values outside JavaScript’s safe integer range, and the computed budget could exceed exact integer precision. Changed input validation to Number.isSafeInteger and added a safe-integer check on the computed budget.
6. The USENIX link label named a different topic from the linked paper. Corrected the label to The RAID-6 Liberation Codes while retaining the valid URL.

## Review Notes
- Verified dmin = N-K+1, 2E+S <= P, all five table rows, and the error-only and erasure-only limits. Detection up to dmin-1 errors is a validity-check guarantee, distinct from correction; the post correctly distinguishes these uses.
- The classical nonzero-position limit and Backblaze’s 256-row limit are compatible: evaluation constructions can include the zero field element. Library layout and field parameters remain necessary for interoperability.
- Ran the extracted JavaScript example under Node.js v24.1.0. Its output matched the published object. Checked all 120 physically possible mixed count pairs for RS(14,10), plus ten invalid-input and arithmetic-overflow cases; all passed.
- The helper checks a theoretical budget, not codec existence, field compatibility, actual damage, or decoder behavior. No Reed-Solomon decoder is implemented or executed by this post.
- Integrity verification and operational margin are appropriate guidance. A trusted digest identifies corrupt input only when the expected digest and shard identity are protected. An unavailable manifest or essential codec metadata can block recovery independently of parity capacity.
- The suggested decoder damage tests are recommendations for adopters, not tests performed during this review. A deterministic correction bound does not itself establish a durability probability.
- All referenced external URLs resolved to relevant resources; the USENIX label was the only link correction. No shell commands, configuration snippets, or pinned dependency versions required validation. The JavaScript APIs used are standard and non-deprecated.
