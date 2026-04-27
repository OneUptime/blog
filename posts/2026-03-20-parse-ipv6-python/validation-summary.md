# Validation Summary: How to Parse IPv6 Addresses in Python - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Python 3 standard library (`ipaddress` module)
- Python `re` module for regex extraction
- IPv6 addressing concepts (compressed form, exploded form, zone IDs, IPv4-mapped, ULA, link-local, multicast, documentation range)

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python `re` module documentation: https://docs.python.org/3/library/re.html (specifically `\b` and lookbehind/lookahead semantics)
- RFC 4291 — IP Version 6 Addressing Architecture
- RFC 4193 — Unique Local IPv6 Unicast Addresses (fc00::/7)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- CPython source (`Lib/ipaddress.py`) for `_private_networks_v6` membership and `is_global` semantics
- Empirical execution of every code block on Python 3.13 to verify outputs

## Issues Found

Three concrete technical bugs were found and fixed in the README.

### 1. `classify_ipv6` produced wrong labels for several test inputs
The original function used `addr.is_private` to detect ULA. For IPv6, `is_private` is not equivalent to fc00::/7 — it returns `True` for the documentation range (2001:db8::/32), the unspecified address (`::`), and IPv4-mapped addresses whose embedded IPv4 is itself private (which includes `::ffff:192.0.2.1` because 192.0.2.0/24 is the IPv4 documentation range). With the original ordering, three of the seven test inputs were mislabeled as "ULA":

```
2001:db8::1        -> ULA (fc00::/7)        # actually documentation
::                 -> ULA (fc00::/7)        # actually unspecified
::ffff:192.0.2.1   -> ULA (fc00::/7)        # actually IPv4-mapped
```

**Fix:** reordered the checks so the more specific properties (`is_unspecified`, `is_loopback`, `ipv4_mapped`, `is_link_local`, `is_multicast`) run first, and replaced the `is_private` test with an explicit `addr in ipaddress.ip_network("fc00::/7")` membership test for ULA. Added a short comment explaining why.

### 2. `ipaddress.ip_network("2001:db8:home::/40")` is not a valid IPv6 prefix
"home" contains the characters `h`, `o`, and `m`, which are not valid hex digits. Running this raised `ValueError: '2001:db8:home::/40' does not appear to be an IPv4 or IPv6 network`, so the entire subscriber-prefix demo would crash before producing any output.

**Fix:** changed the literal to `"2001:db8::/40"`, which is on a valid /40 boundary and produces the intended demo output (the loop now prints subscriber 0, 1, 100, and 255 with /56 prefixes).

### 3. The IPv6 extraction regex missed addresses and matched short
Two bugs in one pattern:

a. **`\b` does not match between two non-word characters.** In `"... from ::ffff:192.0.2.1"`, the `\b` at the start of the pattern sits between a space and a `:` — both non-word — so it never anchors, and the IPv4-mapped address is never matched. (Same problem would apply to any `::`-leading address preceded by whitespace.)

b. **Alternation order was wrong.** The `(?:hex:){1,7}:` alternative ("x::") was tried before the `(?:hex:){1,6}:hex` alternative ("x::x"). For input `"2001:db8::1"`, the engine commits to the first match it finds, so it returned `"2001:db8::"` and silently dropped the trailing `1`. Same effect for `"fe80::1"` — it matched only `"fe80::"`.

**Fix:** replaced both `\b` boundaries with explicit lookarounds `(?<![\w:.])` and `(?![\w:.])` (which exclude word chars, colons, and dots so neighboring address-like characters don't bleed across the boundary), and reordered the alternation to try the most-specific patterns first (IPv4-mapped, full 8-group form, x::x, then x::, then ::x). With the fix, all three log lines extract the full address correctly:

```
'2001:db8::1 port 54321'             -> ['2001:db8::1']
'login from ::ffff:192.0.2.1'        -> ['::ffff:192.0.2.1']
'Access: fe80::1%eth0 (ignored)'     -> ['fe80::1']
```

## Review Notes

- `Python 3.3+` is the correct floor for the `ipaddress` module; `is_global` for IPv6 was added in 3.4, and `IPv6Address.__init__` started accepting embedded scope IDs in 3.9. The post doesn't rely on the 3.9 behavior (it strips `%zone` before parsing), so it works on all 3.3+ versions where `is_global` is available (3.4+ in practice).
- `str()`/`.compressed` of an IPv4-mapped IPv6 address returns the hex form on current CPython (e.g. `::ffff:c000:201` rather than `::ffff:192.0.2.1`). The post never claims a specific dotted-quad output for the normalized form, so this is consistent with Python's actual behavior, but readers running the log-parsing example will see the IPv4-mapped result printed in hex form. Worth being aware of, but not an error in the post.
- The regex is a tutorial-grade pattern, not exhaustive — it does not match every legal IPv6 form (e.g., `"::"` alone, or addresses with two hex groups straddling `::` such as `"a:b::c:d"` would only match via the x::x branch, which it does correctly, but the pattern set as a whole isn't a strict superset of RFC 4291). For production use, the recommended approach in the post (regex extract, then validate via `ipaddress.ip_address()`) is the right pattern, and the validation step catches any false positives.
- `get_subscriber_prefix` materializes the full subnet list each call (`list(base_net.subnets(...))`); for large prefix differences (e.g., /40 → /64 = 2^24 subnets) this is memory-heavy. Acceptable for a tutorial demonstrating the API, but a real IPAM should compute the offset arithmetically (`base_net.network_address + (subscriber_id << shift)`).
