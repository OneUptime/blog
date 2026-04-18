# Validation Summary: How to Validate IPv4 Addresses Using Regex in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3 (`re` module, `ipaddress` module, `timeit`)
- Regular expressions (regex) for IPv4 validation
- IPv4 addressing (RFC 791)

## Sources Consulted
- Python `re` module documentation: https://docs.python.org/3/library/re.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- `ipaddress.IPv4Address` API: https://docs.python.org/3/library/ipaddress.html#ipaddress.IPv4Address
- Python `timeit` module documentation: https://docs.python.org/3/library/timeit.html
- CPython ipaddress source (Lib/ipaddress.py)
- RFC 791 (Internet Protocol) for IPv4 octet range semantics
- CVE-2021-29921 (rejection of leading zeros in `ipaddress` since Python 3.9.5)
- Verified all regex alternatives and test cases empirically with Python 3.12

## Issues Found
- **Broken performance benchmark** in the "Performance Comparison" section. The original code used `ipaddress.IPv4Address.__new__(ipaddress.IPv4Address, ip)` to measure `ipaddress` parsing speed. This is incorrect: `IPv4Address` does its parsing/validation in `__init__`, not `__new__`. Calling `__new__` directly bypasses `__init__`, creates a bare instance with no `_ip` attribute, and performs no validation at all. The measurement would therefore be artificially fast and meaningless.
  - **Fix:** replaced with `ipaddress.IPv4Address(ip)`, which invokes both `__new__` and `__init__` (the standard constructor call) and actually validates the address. Confirmed empirically that `__new__` alone neither raises on `"256.0.0.1"` nor produces a usable instance.

## Review Notes
- The naive and strict regex patterns and all 10 test cases were executed and produce the expected results in Python 3.12.
- The extraction example correctly returns `['192.168.1.50', '10.0.0.1']` and does not spuriously match the dashes in `2026-03-20` or the colons in `10:00:00`, since the pattern requires literal dots as separators.
- The claim that `ipaddress.IPv4Address` rejects leading zeros (e.g. `192.168.01.1`) is accurate for Python 3.9.5+ and 3.10+ (CVE-2021-29921). On older Python releases leading zeros were accepted; readers on unsupported versions should upgrade.
- The strict regex rejects leading zeros (e.g. `192.168.01.1`) as a side effect of its alternatives; this matches the behavior of modern `ipaddress` and is correctly described as "strict" in the post.
- `re.match` only anchors at the start of the string, so the explicit `^` in the compiled patterns is redundant but harmless; kept as-is since it improves readability.
