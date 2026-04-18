# Validation Summary: How to Validate IPv6 Addresses in Python - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Python 3 (`ipaddress` standard library module)
- `ipaddress.ip_address`, `ip_network`, `ip_interface`
- IPv6 address types: loopback, link-local, multicast, ULA, global, documentation
- CIDR notation and prefix length validation
- Pydantic v2 (`BaseModel`, `field_validator`)
- FastAPI / Flask web form validation pattern

## Sources Consulted
- Python `ipaddress` module docs: https://docs.python.org/3/library/ipaddress.html
- Python 3.9 release notes (scope_id support in IPv6Address): https://docs.python.org/3/whatsnew/3.9.html
- CPython source for `ipaddress` (`_private_networks`, `_split_scope_id`)
- Pydantic v2 validators docs: https://docs.pydantic.dev/latest/concepts/validators/
- RFC 4291 (IPv6 Addressing Architecture)
- RFC 4193 (ULA, `fc00::/7`)
- RFC 3849 (`2001:db8::/32` documentation prefix)
- Local verification via `python3 -c "import ipaddress; ..."` on CPython 3.12

## Issues Found
1. **Incorrect claim that `ip_address()` rejects zone IDs.** The basic-validation test case `("2001:db8::1%eth0", False)` (with comment `# zone ID not accepted by ip_address`) was wrong — since Python 3.9, `ipaddress.ip_address()` accepts IPv6 scope/zone identifiers and exposes them via `scope_id`. Confirmed on CPython 3.12 that `ipaddress.ip_address('2001:db8::1%eth0')` parses successfully with `scope_id='eth0'`. Updated the expected value to `True` and corrected the comment to `# zone ID accepted in Python 3.9+`.
2. **Conclusion repeated the same incorrect claim** ("`ip_address()` does not accept them"). Rewrote the closing sentence to state that Python 3.9+ accepts zone identifiers via `scope_id`, and that stripping them is still a reasonable choice only if normalizing away the zone or supporting pre-3.9 interpreters.

## Review Notes
- `is_private` for IPv6 in CPython is broader than just ULA — it includes `::1`, `::`, `::ffff:0:0/96`, `2001::/23`, `2001:db8::/32`, `fc00::/7`, `fe80::/10`, etc. The `IPv6AddressValidator.allow_ula` flag name is slightly misleading because `is_private` gates more than ULA, but because link-local/loopback/multicast are checked on their own branches first, the observable behavior in the example matches the author's intent. Not a correctness bug; just a naming caveat future readers should know.
- `2001:db8::1` is documentation space and therefore `is_global == False` / `is_private == True` in CPython. The `require_global=True` test correctly rejects it, which is the intended teaching moment.
- The Pydantic snippet uses v2 APIs (`field_validator` + `@classmethod`) correctly. It would not work on Pydantic v1 (which uses `@validator`), but that is the current major version, so no change needed.
- The `ip_network(strict=False)` vs `ip_interface(...).network` distinction in the prefix section is subtle but correct: `ip_network('2001:db8::1/64', strict=False)` and `ip_interface('2001:db8::1/64').network` both yield `2001:db8::/64`. The code uses `ip_interface` for non-strict mode, which is fine.
- Invalid prefix `/129` is correctly rejected by `ip_interface` (max IPv6 prefix length is 128).
