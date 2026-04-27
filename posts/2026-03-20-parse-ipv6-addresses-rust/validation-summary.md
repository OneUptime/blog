# Validation Summary: How to Parse IPv6 Addresses in Rust

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Rust standard library `std::net` (`Ipv6Addr`, `IpAddr`, `SocketAddr`)
- Rust `FromStr` trait
- `ipnet` crate (v2.x) — `Ipv6Net`
- `regex` crate (v1.x)
- `url` crate (v2.x) — `Url`, `Host`
- IPv6 wire format / RFC 8200 header layout
- RFC 2732 (IPv6 literals in URLs)

## Sources Consulted
- Rust std docs: https://doc.rust-lang.org/std/net/struct.Ipv6Addr.html
- Rust std docs: https://doc.rust-lang.org/std/net/enum.SocketAddr.html
- ipnet crate docs: https://docs.rs/ipnet/latest/ipnet/struct.Ipv6Net.html
- url crate docs: https://docs.rs/url/latest/url/enum.Host.html
- url crate docs: https://docs.rs/url/latest/url/struct.Url.html
- RFC 8200 (IPv6 header layout)
- RFC 2732 (IPv6 literal addresses in URLs)

## Issues Found

### 1. `extract_host_ip` function did not compile
The original code was:
```rust
url.host()?.to_owned().parse().ok()
```
`Host<&str>::to_owned()` returns `Host<String>`. `Host<String>` does not implement `FromStr` and does not deref to `str`; its inherent `parse` is an associated function `fn parse(input: &str) -> Result<Self, ParseError>`, not an instance method. Calling `.parse()` on a `Host<String>` value therefore fails to compile, and even if it compiled it would return another `Host<String>`, not an `IpAddr`.

**Fix:** Pattern-match on the `Host` enum returned by `url.host()` and construct an `IpAddr` from the `Ipv4`/`Ipv6` variants. Imports updated to `use url::{Host, Url};`.

### 2. IPv6 regex did not match the post's own example
The original regex had three alternatives:
1. Full uncompressed (8 groups): `[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){7}`
2. Trailing-`::`: `(?:[0-9a-fA-F]{1,4}:){1,7}:`
3. Leading-`::`: `::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}`

It was missing the most common compressed form: middle-`::` like `2001:db8::42`. With the original regex, on the example log line `client 2001:db8::42 connected, src 2001:db8::1`, the engine would fall through to alternative 2 and capture `2001:db8::` (truncated), which `parse::<Ipv6Addr>()` would accept as the valid but wrong address `2001:db8:0:0:0:0:0:0`. The promised `Found: 2001:db8::42` output would never appear.

**Fix:** Added a fourth alternative `(?:[0-9a-fA-F]{1,4}:){1,7}(?::[0-9a-fA-F]{1,4})+` and reordered so the more specific middle-`::` form is tried before the trailing-`::` form. Also dropped the `\b` boundaries — they were preventing leading-`::` matches anyway because `:` is not a word character — and rely on the `parse::<Ipv6Addr>()` filter to discard invalid tokens.

## Review Notes
- Confirmed `Ipv6Net::broadcast()` does exist on `Ipv6Net` in `ipnet` 2.x; the docs explicitly note "Technically there is no such thing as a broadcast address for IPv6. The name is used for consistency with colloquial usage." The post's usage is correct.
- IPv6 header layout matches RFC 8200: source address at bytes 8–23, destination at bytes 24–39, total fixed header 40 bytes.
- Byte arrays for `2001:db8::1` and `2001:db8::2` are correct.
- `SocketAddr::from_str` correctly parses both `[ipv6]:port` and `ipv4:port` forms.
- `Ipv6Addr` accepts both compressed and full uncompressed forms via `FromStr`; `assert_eq!` between them is valid.
- The simplified IPv6 regex is still not fully RFC-conformant (it doesn't cover IPv4-mapped/embedded forms like `::ffff:192.0.2.1` or zone IDs); the post correctly labels it "simplified pattern" and relies on `parse()` for final validation.
- The `extract_host_ip` function is defined in the URL section but never invoked from `main` — pedagogically a loose end, but not technically incorrect after the fix.
