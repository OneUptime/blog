# How to Calculate the Reed-Solomon Error-and-Erasure Correction Limit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Erasure Coding, Fault Tolerance, Data Integrity, Distributed Storage, Storage

Description: Calculate Reed-Solomon correction capacity from code distance, unknown errors, known erasures, symbol width, and an explicit operational safety margin.

---

For a conventional Reed-Solomon code written as `RS(N,K)`, each codeword contains `K` data symbols and `P = N-K` parity symbols. Its minimum distance is:

```text
dmin = N - K + 1 = P + 1
```

That distance gives the mixed guaranteed correction condition:

```text
2E + S <= N - K
```

`E` is the count of unknown erroneous symbols and `S` is the count of erasures whose positions are known. The equation applies per codeword.

## Calculate the Basic Cases

From `P = N-K`:

```text
maximum erasures only = P
maximum errors only   = floor(P / 2)
maximum errors with S erasures = floor((P - S) / 2)
```

For `RS(14,10)`, there are four parity symbols:

| Errors | Erasures | Budget used | Guaranteed? |
| ---: | ---: | ---: | --- |
| 0 | 4 | 4 | Yes |
| 1 | 2 | 4 | Yes |
| 2 | 0 | 4 | Yes |
| 1 | 3 | 5 | No |
| 2 | 1 | 5 | No |

One known missing location costs one unit. One unknown wrong value costs two because the decoder must determine both where it is and how to correct it.

## Use a Small Guard Function

```javascript
function correctionBudget(n, k, errors, erasures) {
  for (const value of [n, k, errors, erasures]) {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError('all inputs must be non-negative integers');
    }
  }
  if (k === 0 || k >= n) {
    throw new RangeError('require 0 < K < N');
  }

  const parity = n - k;
  const spent = (2 * errors) + erasures;
  return {
    parity,
    spent,
    remaining: parity - spent,
    guaranteed: spent <= parity
  };
}

console.log(correctionBudget(14, 10, 1, 2));
// { parity: 4, spent: 4, remaining: 0, guaranteed: true }
```

Use this as a precondition, not a decoder. An application rarely knows the count of silent errors in advance, so reserve margin or authenticate every shard and turn detected corruption into erasures.

## Count Symbols, Not Bits

Reed-Solomon operates on symbols from a finite field. With 8-bit symbols, any number of flipped bits in one symbol still counts as one symbol error. Flips spread across three byte symbols count as three errors.

In shard-based storage, coding is usually performed horizontally across equal-sized shards. At byte offset `j`, the bytes at offset `j` in all `N` shards form a codeword. A wholly missing shard creates one erasure in every such codeword. Corruption confined to part of a shard affects only the corresponding codewords, but the shard is often discarded as a whole when its authenticated digest fails.

Do not compare `M` parity shards with the percentage of corrupt bytes without mapping the damage to codeword symbols.

## Check the Field and Library Limits

A full-length classical Reed-Solomon code over `GF(2^w)` has at most `2^w - 1` nonzero evaluation positions, although shortened codes use fewer. Libraries can impose a different interface limit. Backblaze JavaReedSolomon, for example, rejects more than 256 total shards because of how its Vandermonde matrix rows are constructed.

Compatibility requires more than matching `N` and `K`. Record:

- symbol width and finite-field polynomial;
- matrix or evaluation-point construction;
- systematic versus nonsystematic layout;
- shard order and byte order;
- padding and original length;
- codec implementation and version.

Use the exact library's documented constraints and interoperability tests.

## Separate Detection from Correction

The minimum distance says an RS code can detect up to `P` symbol errors when it is only deciding whether a word is valid, or correct up to `floor(P/2)` unknown errors. It cannot in general both correct and retain the full detection claim at once without allocating the distance budget accordingly.

For storage, use cryptographic per-shard hashes or authentication tags. A parity consistency failure says at least one input or parameter is inconsistent, but does not localize the bad shard. Once a trusted hash names the bad index, count it as an erasure.

## Add Operational Margin

Running exactly at `2E+S=P` leaves no capacity for one more unreadable source during recovery. Production design should reserve a margin:

```text
2E_expected + S_expected + margin <= P
```

Choose `margin` from real failure domains and repair time. Include a disk read failing during rebuild, a rack outage, checksum-detected latent damage, planned maintenance, and unavailable metadata.

The algebra is a deterministic codeword bound, not a durability probability. Correlated failures, rebuild duration, placement, and the number of codewords in an object determine service-level risk.

## Fail Closed Beyond the Radius

When `2E+S>P`, recovery is not guaranteed. Depending on the decoder and damage pattern, it may throw, report failure, or produce another valid-looking codeword. Always verify reconstructed shard digests and a whole-object digest from an independent authenticated manifest.

Test every claimed boundary:

1. all erasure counts from zero through `P+1`;
2. all error counts through `floor(P/2)+1`;
3. mixed points on and immediately outside `2E+S=P`;
4. corrupted metadata and swapped indexes;
5. random damage over many seeds.

Success means exact digest equality. Outside-bound tests must never publish unchecked output.

## Conclusion

The Reed-Solomon correction budget is simple but easy to miscount: `P=N-K`, erasures cost one, and unknown errors cost two. Apply the bound to symbols in each codeword, honor the selected library's field and layout rules, and reserve margin for recovery-time failures. No calculation replaces authenticated integrity checks on the reconstructed object.

## Official Documentation

- [EZPWD: Reed-Solomon Error and Erasure API](https://github.com/pjkundert/ezpwd-reed-solomon)
- [Backblaze: JavaReedSolomon Implementation Limits](https://github.com/Backblaze/JavaReedSolomon/blob/master/src/main/java/com/backblaze/erasure/ReedSolomon.java)
- [Microsoft Research: A Reed-Solomon Code for Disk Storage](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/wdas.pdf)
- [USENIX FAST: Open-Source Erasure Coding Libraries for Storage](https://www.usenix.org/legacy/events/fast08/tech/full_papers/plank/plank.pdf)
