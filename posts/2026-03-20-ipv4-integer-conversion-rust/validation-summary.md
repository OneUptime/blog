# Validation Summary: How to Convert Between IPv4 Addresses and Integers in Rust

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rust
- `std::net::Ipv4Addr`
- IPv4 addressing
- Integer conversion with `u32`

## Sources Consulted
- Rust standard library documentation for [`std::net::Ipv4Addr`](https://doc.rust-lang.org/std/net/struct.Ipv4Addr.html)

## Issues Found
- The post originally described `u32::from(ip)` and `Ipv4Addr::from(n)` as using network byte order (big-endian). Rust's official documentation describes these conversions in terms of `Ipv4Addr::to_bits()` and `Ipv4Addr::from_bits()`, which use native byte order. I updated the inline comment and conclusion to match the official docs while preserving the correct numeric examples.
- The original `enumerate_subnet` example could panic for `/32`, `/0`, and invalid prefixes because `(1u32 << host_bits) - 2` can overflow in those cases. I updated the function to validate the prefix and use `u64` arithmetic with `saturating_sub` and `checked_add` so the example remains correct for those edge cases.

## Review Notes
- The sorting example is technically correct as written. `Ipv4Addr` also implements `Ord`, so direct sorting would work too, but no change was needed for accuracy.
