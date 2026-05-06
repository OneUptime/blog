# Validation Summary: How to Compare Two IPv4 Addresses Programmatically

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python `ipaddress`
- JavaScript
- Go `net` and `bytes`
- IPv4 addressing

## Sources Consulted
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Go `net` package documentation: https://pkg.go.dev/net
- Go `bytes` package documentation: https://pkg.go.dev/bytes
- MDN `Array.prototype.sort()` reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
- MDN `Math.sign()` reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign
- MDN `parseInt()` reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt

## Issues Found
- The Go section heading said the example used `net.IP.Equal` and `bytes.Compare`, but the code only used `net.ParseIP().To4()` with `bytes.Compare`. I corrected the heading so it accurately describes the implementation shown.

## Review Notes
- No functional code errors were found in the Python or JavaScript examples for valid IPv4 dotted-decimal input.
- The Go example is correct for valid IPv4 input, but it assumes parsing succeeds. `net.ParseIP` returns `nil` for invalid input, and `To4()` returns `nil` for non-IPv4 input, so production code should validate inputs explicitly.
- Python's `ipaddress.IPv4Address` parsing is strict about leading zeroes in dotted-decimal strings in current Python releases, which is consistent with the examples used here.
