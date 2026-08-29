# How to Generate, Hash, Consume, and Rotate Single-Use MFA Recovery Codes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MFA, Recovery, Authentication, Cryptography, Security

Description: Build MFA recovery codes as high-entropy, one-time authenticators with safe storage, atomic consumption, complete rotation, and an auditable lifecycle.

---

Recovery codes are credentials, not convenient alternate passwords. Anyone who obtains one can normally cross the MFA boundary, so the implementation has to protect the code from generation through use and revocation.

NIST SP 800-63B-4 requires a saved recovery code to contain at least 64 bits from an approved random bit generator, be stored with an approved one-way function, and be subject to throttling. After use, the code must be invalidated and a new saved recovery code issued. For a general web application, generating 128 random bits gives comfortable margin while still producing a code that can be copied or printed.

## Model a Recovery Code Set

Issue a versioned set rather than appending codes forever. A useful record has:

- an opaque set ID, user ID, generation number, creation time, and invalidation time;
- one row per code with a non-secret selector, a salted verifier, and `consumed_at`;
- no plaintext code, QR payload, or reversible copy;
- an audit event for set creation, use, rotation, and revocation.

The selector allows one database row to be found without trying a costly password hash against every code. It does not authenticate the request. One printable representation is `selector.secret`, where `secret` carries the full random entropy and both parts are generated randomly.

```text
raw_secret = CSPRNG(16 bytes)             # 128 random bits
selector   = base32(CSPRNG(5 bytes))
display    = selector + "." + base32(raw_secret)
verifier   = password_hash(raw_secret, unique_salt, configured_parameters)
```

Generate bytes with the operating system's cryptographically secure random generator. Do not use timestamps, UUIDv1 values, database sequences, `Math.random()`, or a hash of user data. Grouping characters for readability is fine, but case folding and removal of separators must be a single documented canonicalization rule. Never reduce entropy by truncating after encoding.

## Store a Verifier, Not the Code

Recovery codes do not need to be recovered by the server, so use one-way verification. For a general web application following OWASP guidance, Argon2id with a unique salt provides defense in depth if the database is stolen; RFC 9106 describes its profiles and tradeoffs. A deployment claiming NIST conformance must use an approved one-way function. If a look-up secret has less than 112 bits of strength, NIST additionally requires a salt and a suitable password-hashing scheme; when using password hashing for a longer code as defense in depth, choose a scheme acceptable under the deployment's cryptographic policy. Do not assume that an OWASP-recommended algorithm is automatically NIST-approved.

A separately protected pepper can be added through a keyed post-hash or password-hashing facility. Keep it in a KMS or secrets service, not beside the hashes. Pepper rotation then needs an explicit migration plan because old verifiers cannot be recomputed without plaintext.

Do not use an unsalted fast hash as protection for a short or human-chosen code; its input space remains guessable offline. A properly generated 128-bit code already resists exhaustive search, while a versioned, salted password-hashing verifier adds defense in depth against future format or generation mistakes. Compare verifier outputs through the library's constant-time verification path.

Show new codes once over an authenticated TLS session. NIST-conforming online delivery of a look-up-secret list requires an AAL2-or-higher authenticated session, an authenticated protected channel, and the post-enrollment binding controls. Mark the response `Cache-Control: no-store`, exclude the value from analytics and error reporting, and warn the user to store it offline or in a password manager. Do not email the set automatically.

## Consume Exactly Once

Verification and consumption must be one atomic operation. A read followed by a later update lets two concurrent requests use the same code.

```text
BEGIN
row = SELECT ... FOR UPDATE
      WHERE user_id = ? AND selector = ? AND invalidated_at IS NULL

if row is absent or row.consumed_at is not null:
    fail with the same public response
if !verify_password_hash(row.verifier, submitted_secret):
    record failed attempt; fail

UPDATE recovery_codes
SET consumed_at = now(), consumed_session_id = ?
WHERE id = ? AND consumed_at IS NULL
COMMIT
```

An atomic conditional update or compare-and-swap is equally valid. Success requires exactly one affected row. Apply throttles per account and recovery-code set, plus broader network abuse controls. Do not reveal whether the selector, account, or code was correct.

A valid saved recovery code is evidence for the recovery policy, not necessarily sufficient evidence by itself. For an account that can authenticate at NIST AAL2, one saved code alone does not complete recovery: the subscriber must use two recovery codes obtained through different methods, one recovery code plus a bound single-factor authenticator, or repeated identity proofing for an identity-proofed account.

After the complete recovery policy succeeds, bind the result to one narrowly scoped recovery transaction. It should permit enrollment of a replacement authenticator, not mint an unrestricted long-lived session. Revoke or re-evaluate existing sessions and notify the account owner through registered channels.

For a deployment claiming NIST SP 800-63B-4 conformance, successful use also requires issuing a new saved recovery code. A set-based implementation can satisfy that lifecycle cleanly by invalidating the used generation and issuing a fresh set after recovery, rather than quietly leaving the user with a shrinking pool forever.

## Rotate the Whole Set

Rotation should create a fresh generation and invalidate every unused code in earlier generations in one transaction. Never keep old and new sets active because the user clicked “regenerate” twice. Require recent authentication with an existing factor when possible; if rotation is part of account recovery, apply the recovery policy instead. A NIST-conforming replacement-code issuance also triggers an account-recovery notification.

Record only safe metadata in the audit trail: actor, target user, set generation, number of codes, outcome, time, and request correlation ID. The codes, their hashes, and user-entered values do not belong in logs.

## Threat Model and Failure Modes

Defend against database theft, application logs leaking submitted codes, online guessing, concurrent replay, a hijacked session rotating the set, and support staff viewing credentials. Common failures include generating short numeric codes, retaining plaintext “for support,” accepting a consumed code during a race, leaving previous generations valid, and returning different errors for unknown selectors.

Recovery is also an account-takeover path. A perfectly hashed code does not compensate for weak issuance, an unthrottled endpoint, or a recovery session that grants more authority than necessary.

## Rollout and Test Checklist

- Generate at least 128 random bits per code and test the encoded entropy.
- Confirm only salted verifiers and non-secret selectors reach the database.
- Verify duplicate concurrent submissions produce exactly one success.
- Test rotation invalidates all older, unused generations atomically.
- Exercise account and distributed abuse throttles without permanent lockout.
- Confirm codes never appear in traces, logs, analytics, crash reports, or email.
- Test recovery issues a restricted transaction and triggers owner notification.
- Rehearse KMS or pepper failure so verification fails closed without destroying data.

## References

- [NIST SP 800-63B-4: Account Recovery](https://pages.nist.gov/800-63-4/sp800-63b.html#recovery)
- [NIST SP 800-63B-4: Saved Recovery Codes](https://pages.nist.gov/800-63-4/sp800-63b.html#savedrecovery)
- [NIST SP 800-63B-4: Look-Up Secret Storage and Delivery](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#lookupsecrets)
- [RFC 9106: Argon2 Memory-Hard Function](https://datatracker.ietf.org/doc/html/rfc9106)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

## Conclusion

Treat recovery codes as a versioned set of strong, single-use credentials. Generate them from a CSPRNG, retain only one-way verifiers, consume them atomically, invalidate whole old generations on rotation, and make successful recovery a constrained, visible security event.
