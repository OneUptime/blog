# Validation Summary: How to Validate IPv4 Address Strings in Rust

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rust (stdlib `std::net::Ipv4Addr`)
- Rust `FromStr` / `str::parse`
- `regex` crate (1.x)
- `std::sync::OnceLock` (stable since Rust 1.70)
- CIDR / IPv4 subnet bit-masking

## Sources Consulted
- Rust std docs for `Ipv4Addr`: https://doc.rust-lang.org/std/net/struct.Ipv4Addr.html
- Rust std docs for `FromStr` impl for `Ipv4Addr`: https://doc.rust-lang.org/std/net/struct.Ipv4Addr.html#impl-FromStr-for-Ipv4Addr
- Rust std docs for `Ipv4Addr::is_private`: https://doc.rust-lang.org/std/net/struct.Ipv4Addr.html#method.is_private
- Rust std docs for `OnceLock`: https://doc.rust-lang.org/std/sync/struct.OnceLock.html
- `regex` crate docs: https://docs.rs/regex/latest/regex/
- Local verification: compiled and ran every code example with `rustc 1.93.0`; all documented outputs were reproduced (including leading-zero rejection for `192.168.01.1`, `OctetOutOfRange` for `10.0.0.256`, `WrongPartCount` for `1.2.3`, CIDR membership for `192.168.1.50` in `192.168.1.0/24`, and `is_private()` returning `true` for `192.168.1.50`).

## Issues Found
No technical issues found.

- Method 1: `s.parse::<Ipv4Addr>()` correctly rejects `10.0.0.256`, `1.2.3`, `1.2.3.4.5`, `::1`, `192.168.01.1` (leading zero), and empty string — verified via `rustc 1.93.0`.
- Method 2: `Ipv4Addr::is_private()` is stable and returns `true` for `192.168.1.50` as shown.
- Method 3: Custom validator compiles and produces the exact error variants shown in the comments for the example inputs.
- Method 4: The regex correctly enforces per-octet ranges 0–255 with no leading zeros (alternation order `25[0-5] | 2[0-4]\d | 1\d{2} | [1-9]\d | \d` covers all valid octets exactly once). `OnceLock<Regex>` is valid since `Regex: Send + Sync`.
- Method 5: Mask calculation correctly special-cases `prefix_len == 0` to avoid the `u32 << 32` overflow panic; `u32::From<Ipv4Addr>` is the stable big-endian conversion (network byte order).

## Review Notes
- The `prefix_len` parameter in `is_in_cidr` is not bounds-checked against `> 32`; if a caller passes, e.g., `33`, the shift `32 - prefix_len` would underflow and panic in debug or wrap in release. Not a correctness bug for the demonstrated inputs, but worth a `debug_assert!(prefix_len <= 32)` in production use.
- In Method 3, Rust's `u16::from_str` accepts a leading `+` (e.g., `"+10"` parses to `10`), so inputs like `"+10.0.0.1"` would be accepted by `validate_ipv4_detailed` but rejected by `Ipv4Addr::from_str`. Mentioned only as a subtle divergence; not a correctness error given the post frames Method 3 as a custom alternative.
- The conclusion correctly recommends `Ipv4Addr::parse()` as the idiomatic and most robust approach.
