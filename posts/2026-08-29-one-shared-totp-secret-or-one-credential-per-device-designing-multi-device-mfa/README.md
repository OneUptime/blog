# One Shared TOTP Secret or One Credential per Device? Designing Multi-Device MFA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TOTP, WebAuthn, MFA, Authentication, Security

Description: Compare cloned TOTP secrets, independent per-device OTP authenticators, WebAuthn credentials, and synchronized passkeys for revocation, auditability, recovery, and abuse limits.

---

Scanning the same TOTP QR code into two phones is convenient, but both devices then hold the same symmetric authenticator secret. The server cannot tell which copy generated a code, revoke only one copy, or reliably audit device use. Two copies improve availability; they remain one server-visible authenticator and prove the same possession factor.

When device-level lifecycle matters, register one independently generated credential per device. WebAuthn supports this model with independently registered single-device credentials. A service can also support multiple TOTP authenticators, each with its own secret, but must handle lookup, replay, and guessing limits carefully.

## Understand the Four Models

### One TOTP Secret Copied to Several Devices

The service stores one encrypted secret and one shared replay state, such as `last_accepted_step`. Every device calculates the same code for a time step. Revoking one lost device requires rotating the shared secret and re-enrolling every remaining copy. Audit can say only “shared TOTP used.”

Authenticator apps may synchronize TOTP secrets through a cloud vault even when the user scanned only once. The relying party often cannot observe or control those copies, so do not promise device-specific revocation.

### Independent TOTP Secret per Device

Each enrollment gets an authenticator-record ID, random secret, encrypted record, lifecycle state, and `last_accepted_step`. Losing one phone invalidates only that authenticator. The server may ask the user to select an authenticator before entry, or compare the submitted code against active authenticators and reject an ambiguous multi-match.

Trying a six-digit code against `N` secrets increases the chance that a guess matches any valid value. Cap the number of active TOTP authenticators and apply an aggregate per-account attempt budget, not `N` independent full budgets. Never reveal which authenticator records were checked.

### One WebAuthn Credential per Authenticator

Each independently registered device-bound authenticator or hardware key creates a unique key pair scoped to the RP. The server stores public keys and can name, audit, and revoke those credentials independently. Syncable credentials are the separate case discussed next. Authentication uses a fresh challenge and validates the returned challenge, assertion signature, expected origin, RP ID hash, user presence, and user verification when required.

This is usually the best model for explicit device lifecycle and phishing resistance, subject to platform support and recovery design.

### A Synchronized Passkey

A synced passkey is a WebAuthn credential whose private key can be copied through a credential-manager sync fabric. From the RP's perspective it can remain one credential ID available on several devices. WebAuthn's backup eligibility and state flags provide signals, not an inventory of every synchronized copy.

Disabling or deleting the RP's credential record prevents it from authenticating to the service, but does not by itself remove synchronized copies, and the RP generally cannot revoke only one copy. The user must also manage devices and the credential through the sync provider. NIST SP 800-63B-4 defines additional requirements and risks for syncable authenticators and notes that syncing is incompatible with AAL3's non-exportability requirement.

## Design the Credential Inventory

Represent every server-visible authenticator credential independently with type-specific fields:

```text
authenticator_record_id, user_id, type, label
credential_id, credential_public_key, webauthn_sign_count
encrypted_totp_secret, last_accepted_totp_step
created_at, verified_at, last_used_at
backup_eligible, backup_state
status, revoked_at, credential_generation
```

Labels are for users, not authentication. Show created and last-used times so users can recognize stale credentials. Require fresh reauthentication at the assurance level required by policy, using an existing enrolled authenticator rather than only the active session, to add a credential, change security-relevant metadata, or revoke another credential.

Do not log TOTP values, secrets, WebAuthn challenges, assertions, or private sync metadata. Use opaque authenticator-record IDs in audit events.

## Plan Loss and Recovery per Model

Encourage two independently recoverable credentials stored in different failure domains. For example, a platform passkey plus a hardware security key gives different availability properties from two synced copies under one provider account.

If an independent credential remains, use it as part of fresh reauthentication at the assurance level required by policy, then revoke and replace the lost credential through a new credential-management transaction. If all are lost, use formal recovery with recovery codes, recovery contacts, and/or repeated identity proofing in the combination required by the account's assurance policy. Do not weaken support proof because multi-device enrollment seems complicated.

After loss or recovery, increment the credential/security generation and revoke affected sessions and trusted-browser tokens. A credential record marked inactive is insufficient if an attacker already has session authority.

## Threat Model and Failure Modes

Defend against copied secrets, device theft, sync-account compromise, code guessing across many authenticators, replay, and misleading audit attribution. Common failures include treating two TOTP copies as independent authenticators or factor types, keeping separate replay state per copy when the server cannot distinguish them, giving every TOTP record a separate attack budget, assuming passkeys are always device-bound, and claiming RP-level per-device revocation for a synced credential.

## Rollout and Test Checklist

- Decide whether the product promises account-level or device-level revocation.
- Never present cloned copies of one TOTP secret as independent authenticators or factor types.
- Generate separate TOTP secrets and replay state for server-visible devices.
- Cap active OTP authenticators and enforce a shared per-account attempt budget.
- Store one public-key record per WebAuthn credential and validate every ceremony.
- Surface syncable versus device-bound properties without overclaiming certainty.
- Test single-device loss, provider-account loss, replacement, and all-authenticator recovery.
- Revoke sessions and trusted devices after compromise or recovery.

## References

- [RFC 6238: TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [NIST SP 800-63B-4: OTP Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [NIST SP 800-63B-4: Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/syncable/)
- [W3C WebAuthn Level 3: Backup Eligibility and State](https://www.w3.org/TR/webauthn-3/#sctn-credential-backup)
- [FIDO Alliance Passkey Resources](https://fidoalliance.org/passkeys/)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Conclusion

Copies of one TOTP secret are one server-visible credential, regardless of device count. Use independent secrets or, preferably, independent WebAuthn key pairs when per-device audit and revocation matter, and account honestly for the different lifecycle of synchronized passkeys.
