# Validation Summary: How to Validate IPv4 Addresses in TypeScript

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- TypeScript (regex, type guards, branded types, type predicates)
- JavaScript RegExp
- Node.js `net` module (`net.isIPv4`)
- Zod runtime validation library

## Sources Consulted
- RFC 791 — Internet Protocol (IPv4 address format): https://datatracker.ietf.org/doc/html/rfc791
- MDN — RegExp: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
- MDN — String.prototype.match: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
- TypeScript Handbook — Narrowing / User-defined type guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
- Node.js docs — `net.isIPv4(input)`: https://nodejs.org/api/net.html#netisipv4input
- Zod documentation — `.refine()` and schema composition: https://zod.dev/

## Issues Found
No technical issues found.

Verification details:
- The regex `/^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)){3}$/` correctly covers the full 0–255 octet range with no overlap and no gaps (`\d` for 0–9, `[1-9]\d` for 10–99, `1\d{2}` for 100–199, `2[0-4]\d` for 200–249, `25[0-5]` for 250–255), and it correctly rejects leading zeros (e.g., `01`), extra/missing octets, and surrounding whitespace via the `^` / `$` anchors.
- Every entry in the test suite produces the expected result under the published regex; the PASS/FAIL harness wording is therefore accurate.
- The user-defined type guard `s is IPv4Address` and the branded-type pattern `string & { readonly __brand: "IPv4Address" }` are standard, current TypeScript idioms.
- The `IPV4_FINDER` regex with `\b` word boundaries and the `g` flag works correctly with `String.prototype.match`, which returns `string[] | null`; the `?? []` fallback is appropriate.
- Zod usage (`z.string().refine(...)`, `z.object({...})`, `z.number().int().min(1).max(65535)`, `z.infer<...>`) matches the current Zod API.
- `require("net").isIPv4(s)` is a valid Node.js built-in that returns a boolean, documented at the URL listed above.

## Review Notes
- The branded-type cast `s as IPv4Address` in `parseIPv4` is the conventional way to produce a branded value after validation; this is intentional and correct, though it relies on the discipline of only creating branded values through validating constructors.
- `\b` word boundaries in `IPV4_FINDER` work for typical log extraction, but readers should be aware that they can still match IP-like substrings embedded in ambiguous text (e.g., inside longer digit runs separated by dots). For stricter extraction, negative look-arounds could be added, but that is a stylistic choice beyond the scope of this post.
- On modern Node.js, `net.isIPv4` can also be imported via `import { isIPv4 } from "node:net"` for ESM users; the `require("net").isIPv4` form shown in the post remains valid.
