# Why You Cannot Hash a TOTP Secret—and How to Encrypt It Safely at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TOTP, MFA, Encryption, Key Management, Secrets Management

Description: Explain why TOTP verification needs the original shared secret and protect that secret with authenticated envelope encryption, narrow access, and safe rotation.

---

A password verifier can compare a stored hash with a hash derived from a submitted password. TOTP works differently: the user submits a short output, while the server independently computes candidate outputs from a long-lived shared secret and the current time step. That computation needs the original secret.

Hashing the TOTP secret and using the hash as a replacement key does not solve the problem. The authenticator app still holds the original key, so the two sides would compute different HMAC values. Provisioning the hash as the key merely makes that hash the new shared secret, which still has to be recoverable by the verifier.

## Why TOTP Verification Is Reversible-Secret Work

RFC 6238 derives a moving counter from Unix time and applies HOTP from RFC 4226:

```text
counter = floor((unix_time - T0) / step)
otp = truncate(HMAC(shared_secret, counter)) mod 10^digits
```

The usual step is 30 seconds. To validate a submitted code, the verifier decrypts the enrolled secret, calculates the expected output for the permitted counter or counters, compares safely, and then discards the plaintext from memory as soon as practical.

This is a fundamental limitation of symmetric OTP, not an argument for storing plaintext. Public-key authenticators such as WebAuthn avoid a shared verifier secret: the service stores a public key and the authenticator retains the private key.

## Use Authenticated Envelope Encryption

Encrypt each TOTP secret with an authenticated-encryption algorithm from a maintained cryptographic library, such as AES-GCM or ChaCha20-Poly1305 where supported by organizational policy. Authentication is essential; encryption without integrity can permit undetected modification. A deployment claiming NIST conformance must select approved cryptography; cryptography used by federal AAL2 verifier implementations also requires FIPS 140 Level 1 validation, so do not assume every otherwise sound AEAD is permitted by that profile.

With envelope encryption:

1. a KMS or HSM protects a versioned key-encryption key (KEK);
2. the application obtains or generates a unique data-encryption key (DEK);
3. the DEK encrypts the TOTP secret with a fresh, unique nonce;
4. the KMS wraps the DEK under the KEK;
5. the database stores ciphertext, nonce, authentication tag, wrapped DEK, algorithm, and key version.

Bind ciphertext to its context with associated data that is reconstructed during decryption:

```text
aad = canonical_encode({
  tenant_id, user_id, factor_id, purpose: "totp-secret", schema_version
})
ciphertext = AEAD_Encrypt(dek, unique_nonce, totp_secret, aad)
```

Associated data prevents a valid ciphertext row from being copied to another user or purpose. It need not be secret, but its encoding must be stable. A nonce must never repeat with the same AEAD key; let a vetted library or KMS generate and enforce it.

## Separate Keys from Data

Database encryption alone is not sufficient when the application can transparently read the same database and key. Keep KEKs in a KMS or HSM with access granted only to the TOTP verification and enrollment workloads. Separate production and non-production keys, tenants where the threat model calls for it, and encryption purposes.

Log KMS authorization decisions and unusual decrypt volume, but never log plaintext, QR provisioning URIs, DEKs, OTP submissions, or full ciphertext records. Disable core dumps or protect them appropriately, avoid placing secrets in immutable language strings, and keep decrypted bytes within the smallest possible scope.

Backups contain encrypted secrets and wrapped keys. Protect both, and document whether a restored environment is authorized to unwrap production DEKs. Disaster recovery that silently exports the KEK into a configuration file defeats the design.

## Plan Both Key and Factor Rotation

KEK rotation and TOTP-factor rotation are different operations:

- **KEK rotation** can usually rewrap each DEK without decrypting and re-encrypting the TOTP secret.
- **DEK or algorithm rotation** decrypts and re-encrypts the secret under a new DEK and nonce.
- **Factor rotation** creates a new random TOTP secret, verifies enrollment, and invalidates the old authenticator.

Store key and schema versions so reads can decrypt old rows during a controlled migration. Write new rows only with the current version, migrate in bounded batches, verify counts, and retire an old KEK only after all ciphertext and recoverable backups have passed the retention boundary.

Do not rotate a user's TOTP secret invisibly: their authenticator would no longer match. Factor rotation requires user enrollment and proof of the new factor.

## Threat Model and Failure Modes

Envelope encryption primarily limits database-only compromise and narrows which workloads can recover secrets. It does not protect against a fully compromised verifier process while it is authorized to decrypt. Reduce that exposure with workload identity, least privilege, rate limits, monitoring, short-lived KMS credentials, and isolation of verification code.

Frequent failures include static nonces, unauthenticated AES-CBC, a KEK in the same database or environment file, one global application key with unrestricted decrypt permission, associated data that can change unexpectedly, plaintext secrets in observability systems, and retiring keys before backups age out.

## Rollout and Test Checklist

- Generate TOTP secrets with a CSPRNG and meet applicable minimum key strength.
- Use a maintained AEAD and a unique nonce for every encryption under a key.
- Bind tenant, user, factor, purpose, and schema version as associated data.
- Restrict KMS decrypt to the enrollment and verification workloads.
- Test row-swapping, modified ciphertext, and modified associated data all fail closed.
- Verify logs, traces, errors, dumps, and analytics contain no secret material.
- Rehearse rewrapping, rollback, backup restore, and old-key retirement.
- Measure decrypt volume and alert on unusual bulk access.

## References

- [RFC 6238: TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [RFC 4226: HOTP](https://datatracker.ietf.org/doc/html/rfc4226)
- [NIST SP 800-63B-4: Single-Factor OTP Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#sfotpa)
- [NIST SP 800-57 Part 1 Rev. 5: Key Management](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)

## Conclusion

The verifier must recover a TOTP shared secret because validation recomputes HMAC outputs. Protect that unavoidable capability with authenticated envelope encryption, contextual binding, KMS-enforced least privilege, disciplined memory and logging practices, and a tested versioned rotation process.
