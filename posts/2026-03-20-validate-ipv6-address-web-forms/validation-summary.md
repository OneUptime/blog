# Validation Summary: How to Validate IPv6 Addresses in Web Forms

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPv6 addressing (RFC 4291)
- HTML5 form inputs
- JavaScript (regex, `URL` constructor, DOM events)
- Python standard library (`ipaddress` module)
- WTForms / Flask-WTF validator pattern

## Sources Consulted
- RFC 4291 — IP Version 6 Addressing Architecture (https://datatracker.ietf.org/doc/html/rfc4291)
- MDN — RegExp flags (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
- MDN — URL() constructor (https://developer.mozilla.org/en-US/docs/Web/API/URL/URL)
- WHATWG URL Standard — host parsing (https://url.spec.whatwg.org/#host-parsing)
- Python docs — `ipaddress` module (https://docs.python.org/3/library/ipaddress.html)
- WTForms docs — writing custom validators (https://wtforms.readthedocs.io/en/3.2.x/validators/)
- Verified behavior locally with `node` and `python3` (see tests in review).

## Issues Found
1. **Invalid JavaScript regex flag `/x`.** The original `isValidIPv6` regex used the `/x` (extended / verbose) flag to allow whitespace and line breaks inside the pattern. JavaScript's `RegExp` has no such flag — its valid flags are `g i m s u y d`. Running the original code produced `SyntaxError: Invalid regular expression flags`. Verified with `new RegExp('test', 'x')` → throws `Invalid flags supplied to RegExp constructor 'x'`. Fixed by compressing the alternation onto a single line (no functional change) and updating the comment to note that JavaScript lacks a verbose mode. Also dropped the embedded `fe80:…%…` link-local branch because the function explicitly strips the `%zone` suffix before matching, so that branch could never match anyway. Also updated the reference from RFC 2373 (obsoleted in 2003) to the current RFC 4291.
2. **`isValidIPv6Reliable` host-comparison logic was incorrect / self-defeating.** The original returned `url.hostname === \`[${address.toLowerCase()}]\` || url.hostname.startsWith('[')`. The first clause fails for valid but non-canonical input (e.g. `2001:0db8::1` gets normalized by the URL parser to `[2001:db8::1]`, so the equality is false), and the second clause is true for every successful parse, which makes the first clause dead code. Fixed to `url.hostname.startsWith('[') && url.hostname.endsWith(']')` — a successful parse with a bracket-wrapped hostname is a sufficient and correct signal, since the WHATWG URL parser throws `TypeError` for anything that isn't a valid IPv6 literal inside brackets. Verified with Node.js: `new URL('http://[invalid]/')` throws, `new URL('http://[2001:DB8::1]/').hostname` → `[2001:db8::1]`.
3. **Misleading "canvas or URL trick" comment.** The code never used a canvas-based technique; only the URL constructor. Rewrote the inline comment to accurately describe what the check does.

## Review Notes
- The Python `ipaddress` section is correct. `IPv6Address("2001:DB8::1")` normalizes to `2001:db8::1`, `::1` is `is_loopback`, `::` is `is_unspecified`, `fc00::/7` is `is_private`, and `IPv6Address("192.0.2.1")` raises `ValueError` — all verified locally.
- Minor future improvement: `ipaddress.IPv6Address` on Python 3.9+ natively parses zone IDs (e.g. `fe80::1%eth0`), so the manual `split('%')[0]` strip in `validate_ipv6` is now optional on modern Python. Left as-is because it does no harm and preserves support for users on 3.8 or earlier.
- The WTForms validator imports `ipaddress` but never uses it for the invalid-input path explicitly — the `ValueError` caught there comes from `IPv6Address(...)` construction, which is correct. No change needed.
- The post's framing that "HTML5 has no native IPv6 input type" is accurate: `<input type="url">` and `<input type="email">` exist, but there is no IPv6-specific input type.
