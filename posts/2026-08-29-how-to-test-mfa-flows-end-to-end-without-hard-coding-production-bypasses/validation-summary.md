# Validation Summary: How to Test MFA Flows End to End Without Hard-Coding Production Bypasses

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Multi-factor authentication state machines and end-to-end testing
- HOTP and TOTP (RFC 4226 and RFC 6238)
- Controlled clocks, replay protection, concurrency, and rate limiting
- WebAuthn and WebDriver virtual authenticators
- Push, SMS, and email delivery adapters and provider sandboxes
- JWT authorization state, step-up authentication, recovery, session revocation, and trusted-device grants

## Sources Consulted

- [RFC 4226: HOTP](https://www.rfc-editor.org/rfc/rfc4226.html), especially Sections 5 and 7 and Appendix D
- [RFC 6238: TOTP](https://www.rfc-editor.org/rfc/rfc6238.html), especially Sections 4 through 6 and Appendix B
- [NIST SP 800-63B-4: Authenticator Requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [NIST SP 800-63B-4: Authenticator Event Management](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- [W3C Web Authentication Level 3: User Agent Automation](https://www.w3.org/TR/webauthn-3/#sctn-automation)
- [W3C Web Authentication Level 3: Signature Counter Considerations](https://www.w3.org/TR/webauthn-3/#signature-counter)
- [W3C Web Authentication Level 3: Registering a New Credential](https://www.w3.org/TR/webauthn-3/#sctn-registering-a-new-credential)
- [W3C Web Authentication Level 3: Verifying an Authentication Assertion](https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion)
- [W3C WebDriver 2: Extensions](https://www.w3.org/TR/webdriver2/#extensions)
- [Selenium: Virtual Authenticator](https://www.selenium.dev/documentation/webdriver/interactions/virtual_authenticator/)
- [Chrome DevTools: Emulate Authenticators and Debug WebAuthn](https://developer.chrome.com/docs/devtools/webauthn)
- [OWASP Web Security Testing Guide: Testing Multi-Factor Authentication](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/11-Testing_Multi-Factor_Authentication)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Issues Found

- The introduction stated that push authentication requires another device. NIST allows the primary and secondary channels to terminate on the same device when they remain separated without claimant participation. Changed the text to say that push uses a separate authenticator channel.
- The WebAuthn paragraph said that a virtual authenticator can require user verification and that the server validates an RP ID. The relying party's request determines whether user verification is required; the virtual authenticator advertises support and simulates success or failure. Authenticator data contains an RP ID hash, not the RP ID itself. Updated the paragraph accordingly, clarified that the exercised counter is the signature counter, and distinguished attestation from assertion signatures.
- The negative-test list treated every future TOTP as invalid. RFC 6238 permits a bounded forward and backward clock-skew window, so a future-step OTP can be valid within policy. Changed the list to reject future OTPs only beyond the permitted clock-skew window and clarified that the exactly-one-success concurrency assertion applies to submissions of the same valid OTP.
- The push test required only binding an approval to a browser transaction. Current NIST guidance requires approval-style out-of-band authentication to transfer a one-time challenge from the primary channel to the authenticator, which also avoids limiting the claim to browser-only flows. Updated the test to require that transfer and binding to one authentication transaction.
- The factor-replacement test universally revoked all sessions and trusted devices. Current guidance calls for invalidating the replaced factor, while broader session and trusted-device revocation depends on the event and policy. Qualified the test so those grants are revoked after recovery or suspected compromise.

## Review Notes

- The `Clock` block is intentionally language-neutral pseudocode; it does not claim a language-specific API or syntax.
- WebAuthn Level 3 is a W3C Recommendation dated 2026-08-25. WebDriver 2 is still a W3C Working Draft as of this review; the virtual-authenticator commands used by the post are defined in the WebAuthn Level 3 Recommendation.
- Email delivery can be tested as described, but NIST SP 800-63B-4 does not permit email as an out-of-band authenticator. OWASP treats email as a weaker possession factor whose status depends on how the email account itself is protected.
- Provider sandbox behavior is provider-specific, but the post correctly avoids claiming a universal sandbox API and calls for contract testing of each production adapter.
- All external links in the post resolved to the intended RFC, W3C, or OWASP material. No deprecated APIs, invalid commands, or invalid configuration examples were present.
