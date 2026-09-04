# How to Decode Reed-Solomon Data When Errors and Erasures Occur Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Erasure Coding, C++, Data Integrity, Recovery, Fault Tolerance

Description: Decode a Reed-Solomon codeword containing both known missing symbols and unknown corrupt symbols while enforcing the mixed correction bound and final integrity checks.

---

Reed-Solomon terminology distinguishes an **erasure**, whose position is known, from an **error**, whose position and value are unknown. A conventional RS code with `P = N - K` parity symbols can correct a mixture only while:

```text
2E + S <= P

E = unknown erroneous symbols
S = known erased symbols
```

An unknown error consumes twice the budget because the decoder must solve for both its position and magnitude. This is why checking each storage shard before decoding is so valuable: a digest mismatch turns an unknown error into a known erasure.

## Confirm That the Decoder Supports Both

Many storage-oriented APIs are erasure-only. Backblaze JavaReedSolomon and Intel ISA-L expect the caller to identify missing sources. Passing corrupted bytes as present can reconstruct the wrong output.

For a true mixed error-and-erasure example, the official `ezpwd-reed-solomon` C++ API accepts a vector of erasure positions and reports corrected positions. Its `ezpwd::RS<255,251>` codec uses 8-bit symbols with four parity symbols.

Build and pin the library version from its official source, run its tests, and record the exact commit used. The core include is header-based:

```cpp
#include <ezpwd/rs>

#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <vector>
```

## Encode a Reference Codeword

```cpp
ezpwd::RS<255, 251> rs; // Four parity symbols.

std::vector<uint8_t> original = {
    'm', 'i', 'x', 'e', 'd', '-', 'r', 's', '-',
    'r', 'e', 'c', 'o', 'v', 'e', 'r', 'y'
};

std::vector<uint8_t> codeword = original;
rs.encode(codeword); // Appends rs.nroots() parity symbols.
```

Persist a cryptographic digest of `original` and, for storage, authenticated digests for each separately stored shard. Reed-Solomon parity proves membership in some valid codeword; it does not prove that the decoded message is the intended one when corruption exceeds the correction radius or metadata is malicious.

## Introduce One Error and One Erasure

Four parity symbols can correct one unknown error plus up to two known erasures because `2*1 + 2 = 4`. This example uses one of each:

```cpp
std::vector<uint8_t> received = codeword;

received[3] ^= 0x5a; // Unknown error; do not report this position.

std::vector<int> erasures = {10};
received[10] = 0;    // Value is irrelevant because position 10 is erased.

std::vector<int> correctedPositions;
int corrected = rs.decode(received, erasures, &correctedPositions);

if (corrected < 0) {
    throw std::runtime_error("Reed-Solomon decode failed");
}

if (received != codeword) {
    throw std::runtime_error("decoded codeword differs from reference");
}

received.resize(received.size() - rs.nroots());
if (received != original) {
    throw std::runtime_error("decoded payload differs from original");
}
```

In production there is no reference `codeword` in memory, so replace those equality checks with authenticated per-shard and whole-object hashes. The corrected-position list is useful diagnostics, but the library documentation notes that a supplied erasure that was not actually wrong might not be returned as a corrected position.

## Build Erasure Positions from Evidence

For a storage stripe, mark a shard as erased only when there is objective evidence:

- it is missing or unreadable;
- its length is wrong;
- its authenticated digest fails;
- the storage device reports an end-to-end checksum failure tied to that exact shard.

Do not label a suspicious but unverified shard healthy merely to reach `K` sources. Also do not guess erasure positions until the budget happens to pass. Preserve all original inputs read-only and run decoding into new buffers.

If authenticated hashes identify every bad shard, prefer an erasure-only decoder. With four parity shards it can recover four known bad members rather than only two unknown ones.

## Enforce the Bound Before Calling Decode

If the system knows there are `S` erasures but does not know how many silent errors remain, reserve explicit margin:

```text
maximum unknown errors = floor((P - S) / 2)
```

For four parity symbols:

| Unknown errors `E` | Erasures `S` | Cost `2E+S` | Result |
| ---: | ---: | ---: | --- |
| 0 | 4 | 4 | Correctable |
| 1 | 2 | 4 | Correctable |
| 2 | 0 | 4 | Correctable |
| 1 | 3 | 5 | Outside guarantee |
| 2 | 1 | 5 | Outside guarantee |

Outside the bound, a decoder may return failure, but depending on the algorithm and pattern it can also miscorrect to another codeword. Never publish based only on a nonnegative return value.

## Apply the Model Correctly to Shards

The formula counts **symbols in one codeword**, not arbitrary bytes or files. Storage erasure coding commonly applies RS independently at each byte offset across equal-sized shards. One missing shard is then one erasure in every horizontal codeword; one silently corrupt shard can be an unknown error at the affected offsets.

Maintain the exact shard index, field parameters, generator/polynomial convention, padding, and original length. Two RS implementations with the same `N` and `K` are not automatically wire-compatible.

After decoding:

1. verify reconstructed shard authentication tags;
2. rebuild data in stable index order;
3. trim only to the recorded original length;
4. verify the whole-object digest;
5. write a new candidate and atomically publish it;
6. retain source shards and a recovery log until rollback expires.

## Conclusion

Mixed recovery is governed by `2E + S <= P`, and the safest way to spend less of that budget is to identify corruption before decode. Use an API that explicitly supports erasure positions and unknown errors, preserve all inputs, and treat decoder success as provisional. Only authenticated shard checks and a whole-object digest make a reconstructed result publishable.

## Official Documentation

- [EZPWD: Reed-Solomon Error and Erasure API](https://github.com/pjkundert/ezpwd-reed-solomon)
- [EZPWD: rs_base Decoder Source](https://github.com/pjkundert/ezpwd-reed-solomon/blob/master/c%2B%2B/ezpwd/rs_base)
- [Microsoft Research: A Reed-Solomon Code for Disk Storage](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/wdas.pdf)
- [USENIX FAST: Open-Source Erasure Coding Libraries for Storage](https://www.usenix.org/legacy/events/fast08/tech/full_papers/plank/plank.pdf)
