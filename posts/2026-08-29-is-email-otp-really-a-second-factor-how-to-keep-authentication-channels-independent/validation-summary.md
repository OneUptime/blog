# Validation Summary: Is Email OTP a Second Factor? Keeping Authentication Channels Independent

## Status

validated

## Post Type

Security architecture and implementation guide

## Technologies Covered

- Email-delivered confirmation codes, OTPs, and recovery codes
- Multi-factor authentication (MFA) and NIST Authentication Assurance Level 2 (AAL2)
- Out-of-band authentication, including SMS and authenticator applications
- Time-based one-time passwords (TOTP)
- WebAuthn, passkeys, physical security keys, user verification, and syncable credentials
- OpenID Connect/JWT Authentication Methods References (`amr`)
- SMTP transport security and TLS
- HTTP GET/POST semantics for confirmation flows

## Sources Consulted

- [NIST SP 800-63B-4 final publication record](https://csrc.nist.gov/pubs/sp/800/63/b/4/final)
- [NIST SP 800-63B-4: Authenticator and Verifier Requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [NIST SP 800-63B-4: Authentication Assurance Levels](https://pages.nist.gov/800-63-4/sp800-63b/aal/)
- [NIST SP 800-63B-4: Authenticator Event Management and Account Recovery](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- [NIST SP 800-63B-4: Syncable Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/syncable/)
- [W3C Web Authentication: An API for Accessing Public Key Credentials, Level 3](https://www.w3.org/TR/webauthn-3/)
- [RFC 6238: TOTP: Time-Based One-Time Password Algorithm](https://www.rfc-editor.org/rfc/rfc6238.html)
- [RFC 8176: Authentication Method Reference Values](https://www.rfc-editor.org/rfc/rfc8176.html)
- [RFC 8461: SMTP MTA Strict Transport Security](https://www.rfc-editor.org/rfc/rfc8461.html)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP Email Validation and Verification Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Microsoft Defender for Office 365 Safe Links documentation](https://learn.microsoft.com/en-us/defender-office-365/safe-links-about)

## Issues Found

- The opening and factor table said that an email code proves mailbox read access or access to a current mailbox session. A code can instead be obtained through forwarding, interception, rerouting, or another delivery-path compromise. The text now states precisely that the claimant demonstrated the ability to obtain a code sent to the registered email address.
- The same-device statement described NIST's rule too generally. It now identifies the rule as applying to an out-of-band secondary channel terminating on the same device as the primary channel and uses NIST's condition that the device not leak information between the channels without claimant participation.
- The post treated `amr` as though it were itself an MFA flag. RFC 8176 defines `amr` as an array of method identifiers and `mfa` as one possible value. The warning now says not to include `mfa` in the `amr` array, or set a custom `mfa=true` claim, when that would falsely assert an independent factor.
- The sensitive-action recommendation could be read as saying that a TOTP or single-factor out-of-band authenticator alone satisfies AAL2. It now calls for recent authentication at the required assurance level and gives a password plus a bound TOTP or conforming out-of-band authenticator as examples, while qualifying WebAuthn with required user verification.
- The post said that WebAuthn always uses local user verification. User verification is configurable and must be required and verified by the relying party when the policy depends on it. The sentence now includes that requirement.
- The table implied that credential-manager account recovery affects every WebAuthn credential. The risk is now limited to syncable credentials, distinguishing them from device-bound credentials such as many physical security keys.

## Review Notes

- The post contains no executable code, commands, or configuration snippets; the review therefore focused on its concrete security implementation guidance, protocol behavior, assurance claims, and reference links.
- The central claim is correct: NIST SP 800-63B-4 prohibits email for out-of-band authentication while excluding email-address confirmation codes and specifically defined issued recovery codes from that prohibition because those are not authentication processes.
- NIST AAL2 conformance depends on the complete authenticator combination and verifier implementation, not only on displaying two prompts. The corrected examples avoid implying that factor count alone establishes conformance.
- A plain hash of a short numeric code does not provide strong offline-guessing resistance because the code space is small. The post's accompanying expiry, single-use, and throttling controls remain essential.
- All four URLs in the post's References section resolved to the intended NIST and OWASP material as of the validation date.
