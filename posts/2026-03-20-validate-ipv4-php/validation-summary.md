# Validation Summary: How to Validate IPv4 Addresses in PHP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP (filter_var, preg_match, preg_match_all)
- FILTER_VALIDATE_IP with FILTER_FLAG_IPV4, FILTER_FLAG_NO_PRIV_RANGE, FILTER_FLAG_NO_RES_RANGE
- PCRE regex in PHP
- Laravel FormRequest validation (ip, ipv4 rules)

## Sources Consulted
- PHP manual — filter_var: https://www.php.net/manual/en/function.filter-var.php
- PHP manual — Validate filters (FILTER_VALIDATE_IP): https://www.php.net/manual/en/filter.filters.validate.php
- PHP manual — Filter flags: https://www.php.net/manual/en/filter.filters.flags.php
- PHP manual — preg_match / preg_match_all: https://www.php.net/manual/en/function.preg-match.php
- Laravel validation documentation (ip, ipv4 rules): https://laravel.com/docs/validation
- RFC 791 (IPv4), RFC 1918 (private ranges), RFC 5735/6890 (reserved/special-use ranges)

## Issues Found
No technical issues found.

- `filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)` correctly rejects leading zeros (e.g., `192.168.01.1`), out-of-range octets, partial addresses, and IPv6 addresses — the post's test expectations match PHP's actual behavior.
- The strict IPv4 regex `(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)` correctly covers 0–255 with no leading zeros, anchored with `^` and `$` and repeated exactly four times via `{3}` for the three dot-separated trailing octets.
- `FILTER_FLAG_NO_PRIV_RANGE` rejects RFC 1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16); `FILTER_FLAG_NO_RES_RANGE` rejects reserved ranges (0.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 224.0.0.0/4, 240.0.0.0/4). The `isPrivateIPv4` / `isPublicIPv4` logic is correct.
- Laravel's `ip` and `ipv4` validation rules delegate to PHP's `filter_var` (via Symfony/Laravel validator internals), and the `target_ip.ipv4` message key format is the correct Laravel convention for rule-specific custom messages.
- The IP extraction regex uses `\b` word boundaries correctly to avoid partial matches inside larger tokens, and `preg_match_all` with `$matches[0]` returns the full-match array as expected.

## Review Notes
- Note: PHP's `FILTER_VALIDATE_IP` accepts `0.0.0.0` and `255.255.255.255` as syntactically valid IPv4 addresses with just `FILTER_FLAG_IPV4`. Applications that want to reject the unspecified address or the limited broadcast address need to add an explicit check or use `FILTER_FLAG_NO_RES_RANGE` (which rejects 0.0.0.0/8 but not 255.255.255.255 specifically). The post's tests correctly reflect the default behavior.
- Link-local addresses (169.254.0.0/16) are classified under `FILTER_FLAG_NO_RES_RANGE`, not `FILTER_FLAG_NO_PRIV_RANGE` — a subtle point not discussed in the post but also not misrepresented.
- The regex approach is presented as a secondary option, appropriately framed for cases where explicit rejection of leading zeros is required (even though filter_var already does this) or for extraction from freeform text.
