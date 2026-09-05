# Validation Summary: How to Decode Reed-Solomon Data When Errors and Erasures Occur Together

## Status
validated

## Post Type
Tutorial / implementation guide.

## Technologies Covered
- Reed-Solomon codes, mixed errors and erasures, and shortened codewords.
- C++11 and the EZPWD Reed-Solomon library.
- Backblaze JavaReedSolomon and Intel ISA-L storage erasure coding.
- Shard integrity, authenticated digests, and recovery publication.

## Sources Consulted
- EZPWD official API documentation: https://github.com/pjkundert/ezpwd-reed-solomon
- EZPWD codec definitions, inspected at commit `62a490c13f6e057fbf2dc6777fde234c7a19098e`: https://github.com/pjkundert/ezpwd-reed-solomon/blob/62a490c13f6e057fbf2dc6777fde234c7a19098e/c%2B%2B/ezpwd/rs
- EZPWD decoder implementation at the same commit: https://github.com/pjkundert/ezpwd-reed-solomon/blob/62a490c13f6e057fbf2dc6777fde234c7a19098e/c%2B%2B/ezpwd/rs_base
- Backblaze official `decodeMissing` implementation: https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomon.java
- Intel ISA-L erasure-code API: https://github.com/intel/isa-l/blob/master/include/erasure_code.h
- Intel ISA-L recovery example: https://github.com/intel/isa-l/blob/master/examples/ec/ec_simple_example.c
- Microsoft Research, A Reed-Solomon Code for Disk Storage, and Efficient Recovery Computations for Erasure-Coded Disk Storage: https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/wdas.pdf
- USENIX FAST 2008, The RAID-6 Liberation Codes (the original, mismatched reference): https://www.usenix.org/legacy/events/fast08/tech/full_papers/plank/plank.pdf
- USENIX FAST 2009, A Performance Evaluation and Examination of Open-Source Erasure Coding Libraries for Storage: https://www.usenix.org/conference/fast-09/performance-evaluation-and-examination-open-source-erasure-coding-libraries
- Corrected USENIX paper URL: https://www.usenix.org/legacy/event/fast09/tech/full_papers/plank/plank.pdf

## Issues Found
1. The introduction described `2E + S <= P` as an absolute limit on successful correction. Changed it to a correction guarantee: outside this bound, successful recovery is not guaranteed, and a decoder can fail or miscorrect. This also makes the introduction consistent with the later discussion.
2. The pre-decode budget calculation omitted its `S <= P` precondition and could imply that the remaining capacity establishes the actual silent-error count. Added rejection of `S > P` and clarified that the formula gives guaranteed capacity, not an observed error count.
3. The USENIX reference linked to the FAST 2008 paper The RAID-6 Liberation Codes rather than the named storage-library comparison. Replaced the URL with the verified FAST 2009 paper URL.

## Review Notes
- Combined the three C++ snippets into a temporary executable by adding `main()`. Compiled with `c++ -std=c++11 -Wall -Wextra` and the official checkout's `c++` include directory. Compilation and execution succeeded; output was `corrected=2 positions=3 10 OK`. Both original equality checks passed.
- The executable used EZPWD commit `62a490c13f6e057fbf2dc6777fde234c7a19098e`. The API supports `std::vector<int>` erasure positions and an optional corrected-position vector; the signed-position overload remains available.
- Confirmed that `RS<255,251>` uses 8-bit symbols and four parity symbols. The 17-byte payload produces a shortened 21-symbol codeword. Encoding appends parity; decoding corrects in place and leaves parity for the caller to remove.
- The official documentation explicitly allows supplied erasures with unchanged values to be absent from the returned correction list. The erased slot remains present in the vector; assigning zero is a valid placeholder.
- Checked the correction table arithmetic and the distinction between individual codeword symbols and shard-wide failures. The storage APIs rely on caller-identified unavailable fragments; their recovery routines do not locate silent errors.
- The integrity and compatibility guidance is sound: parity consistency does not authenticate the intended object, and matching N and K alone does not establish wire compatibility. Authenticated expected digests and trustworthy metadata are prerequisites for the described checks.
- No terminal commands or configuration snippets appear in the post. No deprecated API use was found. The full upstream test suite was not run; runtime validation covered the exact blog example, not every possible corruption pattern.
