# Validation Summary: How to Resolve Hostnames to IPv4 Addresses in Node.js Using dns Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- `dns` module
- `dns/promises` API
- DNS A records
- IPv4 hostname resolution
- Reverse DNS / PTR lookup
- Custom DNS resolvers

## Sources Consulted
- Node.js DNS documentation: https://nodejs.org/api/dns.html
- RFC 2606, Reserved Top Level DNS Names: https://www.rfc-editor.org/rfc/rfc2606

## Issues Found
- The conclusion described `dns.resolve4()` as suitable for "authoritative lookups." Node.js documentation says `dns.resolve4()` uses the DNS protocol and configured DNS servers, but it does not imply that the query goes directly to authoritative name servers. Changed the phrase to "DNS protocol A-record lookups" to match the documented behavior.

## Review Notes
The code examples use current, non-deprecated Node.js DNS APIs. `dns.lookup()` correctly uses the OS resolver path, while `dns.resolve4()` and `dns.reverse()` use DNS queries. The `ttl: true` option for `resolve4()` and the `dns/promises` examples match the documented API. Runtime spot checks were performed with Node.js v22.22.0.
