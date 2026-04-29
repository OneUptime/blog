# Validation Summary: How to Handle IPv6 in JWT Token Claims

## Status
validated

## Post Type
Guide

## Technologies Covered
- JSON Web Token (JWT)
- IPv6 and IPv4-mapped IPv6 addresses
- Node.js
- `jsonwebtoken` for Node.js
- Python
- PyJWT
- Python `ipaddress` module
- `curl`

## Sources Consulted
- RFC 7519: JSON Web Token (JWT): https://datatracker.ietf.org/doc/rfc7519/
- RFC 4648: The Base16, Base32, and Base64 Data Encodings: https://datatracker.ietf.org/doc/html/rfc4648
- RFC 4291: IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- Node.js `net` API documentation: https://nodejs.org/download/release/v24.1.0/docs/api/net.html
- `auth0/node-jsonwebtoken` README: https://github.com/auth0/node-jsonwebtoken
- PyJWT API reference: https://pyjwt.readthedocs.io/en/latest/api.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `ipaddress` HOWTO: https://docs.python.org/3/howto/ipaddress.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
1. **JavaScript signing and verification secret mismatch**: The token creation example used `process.env.JWT_SECRET || 'your-256-bit-secret'`, but the validation example verified against only `process.env.JWT_SECRET`. This would fail when the environment variable was unset. I added the same `SECRET_KEY` constant to the middleware and used it for verification.

2. **JavaScript example could throw on missing IP data**: `normalizeIP()` returned `null`, but `createToken()` immediately called `normalizedIP.includes(':')` and `crypto.update(normalizedIP)`. That raises a runtime error when the IP is missing. I made `ip_version` and `ip_hash` conditional on a normalized IP being present.

3. **IP normalization was incomplete for IPv6 comparison**: The original code only stripped dotted IPv4-mapped IPv6 addresses and otherwise relied on raw string comparison. Equivalent IPv6 forms such as `2001:0db8:0:0:0:0:0:1` and `2001:db8::1` would compare as different strings. I canonicalized IPv6 in the Node.js example and switched the Python example to the standard `ipaddress` module so comparisons use a normalized representation.

4. **JWT decode command used the wrong encoding assumption**: The shell example piped the JWT payload through `base64 -d`, but JWT segments use base64url encoding per RFC 7519 and RFC 4648. I replaced the command with a Python base64url decoding snippet that also restores missing padding safely.

5. **The “different IPv6 address” test was not testing the client IP**: Changing the request URL from `http://[::1]:3000` to `http://[2001:db8::1]:3000` changes the destination, not the client/source address. I updated the example to demonstrate using the token on an IPv6 endpoint and noted that a real mismatch test must come from a different client network or host.

6. **Some wording overstated what the claim itself does**: The introduction and conclusion implied that adding the claim itself provides IP binding. In practice, the claim only supports application-level IP binding when validation logic checks it. I adjusted those lines to reflect that distinction.

## Review Notes
- The revised JavaScript normalization uses `net.SocketAddress`, which is available in modern Node.js releases but was added in Node.js v14.18.0/v15.14.0. Older runtimes would need a different IPv6 canonicalization approach.
- The post is technically sound after these fixes, and the caution about dynamic IPv6 addresses causing false positives remains appropriate.
