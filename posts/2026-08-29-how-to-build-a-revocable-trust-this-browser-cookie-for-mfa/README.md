# How to Build a Revocable “Trust This Browser” Cookie for MFA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MFA, Cookie, Session Management, Authentication, Security

Description: Implement a trusted-browser token as a random, server-tracked, revocable credential with narrow scope, hardened cookie attributes, expiry, and step-up exclusions.

---

“Trust this browser” normally means that after the password succeeds, possession of a long-lived browser token can suppress a routine MFA prompt. That token is a credential. It is not proof that the same physical device is present, not an account-recovery code, and not automatically sufficient for an assurance level defined by NIST.

NIST SP 800-63B-4 is stricter: browser cookies do not satisfy the physical-authenticator requirement except as short-term secrets for session maintenance, not authentication. A long-lived remembered-browser token therefore must not be counted as a NIST MFA factor or used to claim AAL2.

If an attacker steals it, they receive the same bypass until it expires or is revoked. Make that risk explicit before deciding the feature belongs in the threat model.

## Issue Only After Full Authentication

Offer trust only after a completed MFA ceremony and explicit user choice. Never issue the token from a pre-MFA session, from an email-link confirmation, or merely because the browser has been seen before. Consider disabling the option for administrators, shared terminals, regulated transactions, and users who select “public device.”

Generate an independent random selector and a validator with at least 256 random bits:

```text
selector  = CSPRNG(16 bytes)
validator = CSPRNG(32 bytes)  # 256 random bits
cookie = base64url(selector) + "." + base64url(validator)

server row = {
  selector,
  validator_verifier: HMAC(server_pepper, canonical_encode(selector, user_id, validator)),
  user_id,
  created_at,
  last_used_at,
  expires_at,
  factor_generation,
  revoked_at
}
```

The selector only finds the row. Reconstruct the keyed digest with the row's authoritative user ID and compare it in constant time. Binding those values prevents a valid verifier from being copied between rows without detection. A 256-bit random validator also permits a standard cryptographic hash, but a separately protected HMAC key limits what a database-only attacker can test or manufacture. Do not put user ID, MFA status, expiry, or a self-asserted signature payload in a client-editable format unless every field is cryptographically protected and server-side revocation still exists.

## Harden and Narrow the Cookie

Set the value from HTTPS with attributes similar to:

```http
Set-Cookie: __Host-mfa_trust=SELECTOR.VALIDATOR; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1209600
```

The `__Host-` prefix requires `Secure`, `Path=/`, and no `Domain`, preventing subdomains from setting a domain-wide cookie in supporting browsers. Choose `SameSite=Strict` when the login and federation UX allows it; `Lax` is often more compatible but is not a substitute for CSRF protection. Never place the token in a URL or local storage.

Keep lifetime as short as the user need permits and enforce expiry on the server; `Max-Age` is only browser behavior. Rotate the validator periodically and after suspicious use. If rotating on every use, design a very small, server-controlled grace mechanism for parallel tabs without allowing an entire old token family indefinitely.

## Validate It in a Defined Login State

Evaluate the token only after the primary authenticator succeeds and against the same user identified by that login. Require:

- an active, unexpired server record and matching validator;
- current factor/security generation;
- an account and tenant policy that still permits trusted browsers;
- no recovery, factor replacement, password reset, or high-risk signal requiring full MFA.

On success, establish a new normal session and rotate its identifier. Do not upgrade an anonymous session in place. Record that the session used a trusted-browser credential rather than an interactive second-factor ceremony so later authorization can distinguish them.

IP address and exact user-agent binding are unreliable and can lock out legitimate users or leak tracking data. Treat large context changes as risk signals, not cryptographic proof. If the service needs device-bound phishing-resistant authentication, use WebAuthn rather than increasingly elaborate cookie fingerprinting.

## Make Revocation Real

Give users a list of trusted browsers with coarse name, creation time, and last use, plus controls to revoke one or all. Revoke tokens on account recovery, factor replacement, suspected compromise, administrative policy changes, and optionally password changes. Incrementing a per-account factor generation invalidates every row immediately even if cleanup is asynchronous.

Server-side state is what makes targeted revocation possible. A purely self-contained long-lived token remains usable until expiry unless every request also checks a denylist or security epoch.

Always require interactive step-up for factor changes, recovery settings, payment destinations, API-key creation, privilege changes, and similarly sensitive actions. A trust token that suppresses those checks quietly becomes the account's strongest authenticator.

## Threat Model and Failure Modes

Defend against cookie theft through XSS, malware, logs, backups, subdomain compromise, shared profiles, database theft, fixation, and post-recovery reuse. Common failures include readable JavaScript storage, a domain cookie shared with untrusted subdomains, plaintext server storage, no per-device record, trusting unsigned client fields, accepting the cookie before password verification, and exempting sensitive actions.

`HttpOnly` reduces JavaScript readout but does not make XSS harmless: injected code may still perform authenticated actions. Maintain CSP, output encoding, CSRF controls, and session defenses.

## Rollout and Test Checklist

- Document which login prompts the token may suppress and which it never may.
- Generate a high-entropy opaque validator and retain only a keyed verifier.
- Set `Secure`, `HttpOnly`, appropriate `SameSite`, host-only scope, and server expiry.
- Issue only after interactive MFA and bind the row to factor generation.
- Test individual, global, recovery-triggered, and replacement-triggered revocation.
- Confirm pre-MFA and sensitive-action endpoints reject trusted-browser authority.
- Test XSS, CSRF, subdomain, fixation, database-theft, and parallel-tab scenarios.
- Show users safe metadata and notify them about new trusted browsers.

## References

- [NIST SP 800-63B-4: Session Management](https://pages.nist.gov/800-63-4/sp800-63b/session/)
- [NIST SP 800-63B-4: Session Cookies](https://pages.nist.gov/800-63-4/sp800-63b/session/#sesscookies)
- [RFC 6265: HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)
- [IETF RFC6265bis-22: SameSite and Cookie Name Prefixes](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

## Conclusion

A trusted-browser cookie is a revocable bypass credential, not a magical device identity. Issue it only after full authentication, store a server-verifiable opaque token, constrain its cookie and policy scope, record how it was used, and revoke it whenever the account's authenticator state changes.
