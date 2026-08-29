# One Shared TOTP Secret or One Credential per Device? Designing Multi-Device MFA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TOTP, WebAuthn, MFA, Authentication, Security

Description: Compare cloned TOTP secrets, independent per-device OTP factors, WebAuthn credentials, and synchronized passkeys for revocation, auditability, recovery, and abuse limits.

---

Scanning the same TOTP QR code into two phones is convenient, but both devices then hold the same symmetric authenticator secret. The server cannot tell which copy generated a code, revoke only one copy, or reliably audit device use. Two copies improve availability; they do not provide two independent factors.

When device-level lifecycle matters, register one independently generated credential per device. WebAuthn is designed around this model. A service can also support multiple TOTP factors, each with its own secret, but must handle lookup, replay, and guessing limits carefully.

## Understand the Four Models

### One TOTP Secret Copied to Several Devices

The service stores one encrypted secret and one replay counter. Every device calculates the same code for a time step. Loss of one device requires rotating the shared secret and re-enrolling every remaining copy. Audit can say only “shared TOTP used.”

Authenticator apps may synchronize TOTP secrets through a cloud vault even when the user scanned only once. The relying party often cannot observe or control those copies, so do not promise device-specific revocation.

### Independent TOTP Secret per Device

Each enrollment gets a factor ID, random secret, encrypted record, lifecycle state, and `last_accepted_step`. Losing one phone invalidates only that factor. The server may ask the user to select an authenticator before entry, or compare the submitted code against active factors.

Trying a six-digit code against `N` secrets increases the chance that a guess matches any valid value. Cap the number of active TOTP factors and apply an aggregate per-account attempt budget, not `N` independent full budgets. Never reveal which factor almost matched.

### One WebAuthn Credential per Authenticator

Each independently registered device-bound authenticator or hardware key creates a unique key pair scoped to the RP. The server stores public keys and can name, audit, and revoke those credentials independently. Syncable credentials are the separate case discussed next. Authentication sends a fresh challenge and validates a signature, origin, RP ID, presence, and required user verification.

This is usually the best model for explicit device lifecycle and phishing resistance, subject to platform support and recovery design.

### A Synchronized Passkey

A synced passkey is a WebAuthn credential whose private key can be copied through a credential-manager sync fabric. From the RP's perspective it can remain one credential ID available on several devices. WebAuthn's backup eligibility and state flags provide signals, not an inventory of every synchronized copy.

Revoking that RP credential removes it for the service, but the RP generally cannot revoke only one synced copy. The user must also manage devices and the credential through the sync provider. NIST SP 800-63B-4 defines additional requirements and risks for syncable authenticators and notes that syncing is incompatible with AAL3's non-exportability requirement.

## Design the Credential Inventory

Represent every server-visible factor independently:

```text
factor_id, user_id, type, label
credential_id or encrypted_totp_secret
created_at, verified_at, last_used_at
last_accepted_totp_step
backup_eligible, backup_state
status, revoked_at, factor_generation
```

Labels are for users, not authentication. Show created and last-used times so users can recognize stale factors. Require recent proof from an existing factor to add, rename security-relevant metadata, or revoke another factor.

Do not log TOTP values, secrets, WebAuthn challenges, assertions, or private sync metadata. Use opaque factor IDs in audit events.

## Plan Loss and Recovery per Model

Encourage two independently recoverable credentials stored in different failure domains. For example, a platform passkey plus a hardware security key gives different availability properties from two synced copies under one provider account.

If one independent credential remains, use it to authorize revocation and replacement through a fresh factor-management transaction. If all are lost, use formal recovery with saved recovery codes, recovery contacts, or identity proofing as policy requires. Do not weaken support proof because multi-device enrollment seems complicated.

After loss or recovery, increment the factor/security generation and revoke affected sessions and trusted-browser tokens. A factor record marked inactive is insufficient if an attacker already has session authority.

## Threat Model and Failure Modes

Defend against copied secrets, device theft, sync-account compromise, code guessing across many factors, replay, and misleading audit attribution. Common failures include calling two TOTP copies two factors, keeping a separate replay counter per copy when the server cannot distinguish them, giving every TOTP record a separate attack budget, assuming passkeys are always device-bound, and claiming RP-level per-device revocation for a synced credential.

## Rollout and Test Checklist

- Decide whether the product promises account-level or device-level revocation.
- Never present cloned copies of one TOTP secret as independent factors.
- Generate separate TOTP secrets and replay state for server-visible devices.
- Cap active OTP factors and enforce a shared per-account attempt budget.
- Store one public-key record per WebAuthn credential and validate every ceremony.
- Surface syncable versus device-bound properties without overclaiming certainty.
- Test single-device loss, provider-account loss, replacement, and all-factor recovery.
- Revoke sessions and trusted devices after compromise or recovery.

## References

- [RFC 6238: TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [NIST SP 800-63B-4: OTP Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [NIST SP 800-63B-4: Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#syncable-authenticators)
- [W3C WebAuthn Level 3: Backup Eligibility and State](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)
- [FIDO Alliance Passkey Resources](https://fidoalliance.org/passkeys/)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Conclusion

Copies of one TOTP secret are one server-visible credential, regardless of device count. Use independent secrets or, preferably, independent WebAuthn key pairs when per-device audit and revocation matter, and account honestly for the different lifecycle of synchronized passkeys.
