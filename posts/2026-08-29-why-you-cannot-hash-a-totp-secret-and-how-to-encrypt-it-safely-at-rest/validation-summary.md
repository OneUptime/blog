# Validation Summary: Why You Cannot Hash a TOTP Secret—and How to Encrypt It Safely at Rest

## Status

validated

## Post Type

Security implementation guide

## Technologies Covered

- TOTP and HOTP
- HMAC and cryptographic hash functions
- AES-GCM and ChaCha20-Poly1305 authenticated encryption
- Envelope encryption with DEKs and KEKs
- KMS and HSM key management
- Associated data and nonce management
- WebAuthn public-key authentication
- NIST digital identity, key-management, and FIPS 140 requirements

## Sources Consulted

- [RFC 6238: TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [RFC 4226: HOTP](https://datatracker.ietf.org/doc/html/rfc4226)
- [RFC 2104: HMAC](https://datatracker.ietf.org/doc/html/rfc2104)
- [RFC 5116: Authenticated Encryption](https://datatracker.ietf.org/doc/html/rfc5116)
- [RFC 8439: ChaCha20 and Poly1305](https://datatracker.ietf.org/doc/html/rfc8439)
- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [NIST SP 800-63B-4: Authentication Assurance Level 2](https://pages.nist.gov/800-63-4/sp800-63b/aal/#aal2)
- [NIST SP 800-63B-4: OTP Authenticators and Verifiers](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#sfotp)
- [NIST SP 800-57 Part 1 Rev. 5: Key Management](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final)
- [NIST SP 800-38D: GCM and GMAC](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [Google Tink: Bind Ciphertext to Its Context](https://developers.google.com/tink/bind-ciphertext)
- [Google Tink: Client-Side Envelope Encryption with a Cloud KMS](https://developers.google.com/tink/client-side-encryption)

## Issues Found

- The original explanation said TOTP always needs the original secret and that hashing it necessarily changes the HMAC result. This was too absolute: HMAC first hashes keys longer than its hash function's block size, and protected precomputed HMAC state can also be key-equivalent. The text now explains that a password-style verifier is insufficient while any digest, state, or service capable of generating valid codes remains sensitive key-equivalent material.
- The original pseudocode used `truncate(...) mod 10^digits`, although RFC 4226's named `Truncate` function already includes the modulo reduction. It also omitted the HOTP counter's 8-byte big-endian encoding and output zero-padding. The pseudocode now distinguishes dynamic truncation, encodes the counter with `uint64_be`, and pads the result to the configured number of digits.
- The verification flow omitted the requirement to reject an OTP that was already accepted while valid and did not explicitly apply rate limiting. Both controls were added to align with RFC 6238 and NIST SP 800-63B-4.
- WebAuthn was described as a public-key authenticator, but WebAuthn is an API and authentication specification. The sentence now refers to public-key authentication with WebAuthn and retains the correct public/private-key roles.
- The NIST statement presented FIPS 140 Level 1 validation as an unconditional requirement for federal AAL2 OTP verifiers. SP 800-63B-4 gives the general AAL2 verifier requirement but expressly exempts OTP authenticators and verifiers. The paragraph now states both the general rule and the OTP-specific exception and notes that other governing profiles may impose stricter requirements.
- The associated-data claim did not explicitly require the bound identity to come from trusted context. It now clarifies that tenant, user, factor, and purpose data must be reconstructed from trusted record identity rather than copied with attacker-movable ciphertext fields for row-swap protection to hold.
- The nonce guidance implied every vetted library or KMS generates and enforces nonce uniqueness. Many low-level AEAD APIs accept caller-supplied nonces and do not track reuse. The post now prefers APIs that manage nonces internally and directs callers to follow the selected API's documented uniqueness construction when supplying nonces themselves.
- KMS access was originally limited to enrollment and verification even though the described DEK and algorithm migration requires a rotation workload. The access guidance and checklist now include tightly controlled rotation workloads and require operation-level least privilege.
- The old-KEK retirement wording conflated stopping new wraps with destroying the key. It now says to stop new wraps at rotation and retain unwrap capability until active DEKs are rewrapped and dependent recoverable backups are migrated or expire.
- The failure-mode list referred broadly to static nonces, even though nonce uniqueness is scoped to a key. It now identifies reuse of a nonce with the same key as the failure.

## Review Notes

The post uses language-neutral pseudocode rather than executable application code or terminal commands. All external links in the post resolved to the intended RFC, NIST, OWASP, and author resources. The referenced NIST versions are current final publications as of the validation date: SP 800-63B-4 is final, and SP 800-57 Part 1 Rev. 5 remains final while Revision 6 is still a draft.
