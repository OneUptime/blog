# Validation Summary: How to Create an OpenVPN Certificate Authority and Generate IPv4 Client Keys

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenVPN (community edition, 2.5+/2.6 syntax)
- EasyRSA 3.1.7 (PKI management tool)
- OpenSSL (for DH parameter generation)
- TLS / X.509 PKI

## Sources Consulted
- EasyRSA v3.1.7 release on GitHub: https://github.com/OpenVPN/easy-rsa/releases/tag/v3.1.7 (verified release tag and `EasyRSA-3.1.7.tgz` asset exist)
- EasyRSA-Readme documentation: https://github.com/OpenVPN/easy-rsa/blob/v3.1.7/doc/EasyRSA-Readme.md (verified `init-pki`, `build-ca`, `gen-req`, `sign-req <type> <name>`, `revoke`, `gen-crl` syntax)
- OpenVPN 2.6 manual, encryption-options.rst: https://github.com/OpenVPN/openvpn/blob/release/2.6/doc/man-sections/encryption-options.rst (verified `--genkey secret ta.key` is the correct modern syntax with `secret`, `tls-crypt`, `tls-auth`, `auth-token`, `tls-crypt-v2-server`, `tls-crypt-v2-client` as valid keytypes)
- OpenVPN 2.6 manual, tls-options.rst: https://github.com/OpenVPN/openvpn/blob/release/2.6/doc/man-sections/tls-options.rst (verified `--tls-auth` direction parameter semantics: 0 for server, 1 for client)

## Issues Found
1. **Misleading comment on alternate DH generation method.** The original text read `# Or use a pre-generated DH param from OpenVPN (faster)` above the `openssl dhparam -out pki/dh.pem 2048` command. This was inaccurate on two counts: (a) `openssl dhparam` does not use pre-generated parameters — it generates fresh ones, and (b) it is not meaningfully faster than `easyrsa gen-dh`, since EasyRSA also calls OpenSSL under the hood and uses the same default 2048-bit size. Replaced with `# Or generate DH parameters directly with openssl`, which accurately describes the alternative.

## Review Notes
- **AES-256-CBC cipher choice**: The post uses `cipher AES-256-CBC`, which is still functional in OpenVPN 2.6 but is considered legacy. Modern deployments are encouraged to use the `data-ciphers AES-256-GCM:AES-128-GCM` directive for AEAD ciphers. The current setting will continue to work (it gets used as `data-ciphers-fallback`) but is not best-practice for new deployments.
- **tls-auth vs tls-crypt**: The post uses `tls-auth` for HMAC authentication of the TLS handshake. `tls-crypt` (introduced in OpenVPN 2.4) provides both authentication and encryption of the handshake, and is generally recommended for new deployments. Either approach is valid; this is a future improvement, not an error.
- **DH parameter size**: 2048 bits is the minimum acceptable DH parameter size by current standards. 4096 bits is recommended for stronger long-term security, but 2048 is still acceptable for tutorials and general use.
- **EasyRSA version currency**: v3.1.7 is a valid recent release. EasyRSA 3.2.x has since been released, but 3.1.7 still works and the documented commands are unchanged across the 3.x series.
- **`user nobody` / `group nogroup`**: These work on Debian/Ubuntu. On RHEL/CentOS/Fedora the equivalent group is `nobody` (not `nogroup`). The post does not call this out, but it is a common gotcha worth noting in a future revision.
