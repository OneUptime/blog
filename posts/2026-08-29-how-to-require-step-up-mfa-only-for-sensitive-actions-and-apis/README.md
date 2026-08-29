# How to Require Step-Up MFA Only for Sensitive Actions and APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MFA, API Security, Authentication, Authorization, Security

Description: Apply server-side step-up policy to sensitive actions using trusted authentication context, short-lived bound transactions, and interoperable API challenges.

---

Prompting for MFA on every page trains users to approve prompts mechanically and harms accessibility. Prompting only at initial login can leave a stolen long-lived session able to change factors, export data, or create credentials. Step-up authentication targets the gap: require stronger or more recent proof when the requested action warrants it.

Step-up is an authorization input, not a frontend dialog. The API that performs the action must decide whether the authenticated context satisfies policy.

## Build an Action Policy Matrix

Classify actions by impact and specify the required authentication strength, allowed methods, and maximum age. For example:

| Action | Example requirement |
| --- | --- |
| Read ordinary profile data | Existing authenticated session |
| Reveal recovery-code status | Recent MFA |
| Add or remove a factor | Recent proof with an existing factor |
| Change payout destination | Recent phishing-resistant proof plus transaction confirmation |
| Create administrator API key | Recent phishing-resistant proof and privileged role |

Exact rules depend on the threat model. Evaluate risk signals—new device, recovery, impossible travel, compromised-session alert—as reasons to strengthen or deny an action, not as replacements for baseline policy.

Centralize policy so web, mobile, GraphQL, REST, and internal gateways cannot drift. Deny by default when authentication context is missing or unrecognized.

## Carry Trusted Authentication Context

The authorization service needs server-issued facts such as:

```json
{
  "sub": "user-opaque-id",
  "acr": "urn:example:aal:phishing-resistant",
  "amr": ["pwd", "hwk", "user"],
  "auth_time": 1787990400,
  "sid": "opaque-session-id"
}
```

Treat values as illustrative; define and document local `acr` semantics. `amr` describes methods used, while `acr` describes the resulting authentication context. Validate the token's signature and fixed algorithm, issuer, audience, type, expiry, and session state before trusting claims. Never accept `mfa=true` from a request body, browser storage, or an unsigned token.

Authentication freshness is measured from the active proof, not token refresh time. Refreshing a token without user interaction must not update `auth_time`.

## Challenge Without Performing the Action

When context is insufficient, save or reconstruct the intended operation safely and issue a short-lived, one-use challenge bound to:

- user and session;
- action type and target resource;
- security-relevant transaction details;
- required context and maximum age;
- nonce, creation time, and expiry.

After proof, re-run authorization and business validation. Do not automatically replay stale browser requests, especially transfers or destructive actions. Display critical details and require explicit confirmation to prevent an attacker from initiating one action and repurposing approval for another.

For OAuth-protected APIs, RFC 9470 defines a `401` challenge using `insufficient_user_authentication` with `acr_values` and/or `max_age`:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="insufficient_user_authentication",
  acr_values="urn:example:aal:phishing-resistant", max_age="300"
```

The client can obtain a token meeting the requirement from the authorization server. The resource server must still validate that the returned token actually satisfies policy; an authorization server may fail to meet a requested context.

## Limit the Elevation

Avoid turning one step-up into a day-long globally elevated session. Prefer a short authentication-context lifetime or an action grant bound to one resource and operation. Consume a one-time grant atomically with the state-changing request and an idempotency key.

A new high-context access token does not necessarily invalidate lower-context tokens. Ensure lower tokens remain unable to call the sensitive endpoint. Revoke or downgrade sessions after recovery, factor replacement, suspected hijacking, and policy changes.

For actions whose integrity matters as much as identity, authentication alone may be insufficient. Bind the approval to transaction details and use the OWASP transaction-authorization principles: the user should see and authorize what will execute.

## Threat Model and Failure Modes

Defend against stolen sessions, confused-deputy clients, replayed approvals, token substitution, stale transaction state, and attackers bypassing the UI to call an API directly. Common failures include client-only route guards, globally setting `mfa=true`, refreshing `auth_time`, accepting any second factor when phishing resistance is required, not binding the challenge to action details, and performing the action before step-up completes.

Step-up does not repair broken authorization. Always check ownership, role, tenant, object state, and business constraints again at execution.

## Rollout and Test Checklist

- Inventory sensitive actions across every UI, API, and support surface.
- Define centrally enforced method, context, and freshness requirements.
- Validate authentication claims and live session state at the resource server.
- Bind short-lived challenges to user, session, action, target, and nonce.
- Re-run authorization and transaction validation after successful proof.
- Keep elevation short or issue a one-time action-bound grant.
- Test direct API calls, token substitution, replay, stale state, and races.
- Monitor challenge, failure, abandonment, and bypass-denial rates.

## References

- [RFC 9470: OAuth 2.0 Step Up Authentication Challenge Protocol](https://datatracker.ietf.org/doc/html/rfc9470)
- [OpenID Connect Core: `acr`, `amr`, and `auth_time`](https://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- [RFC 8176: Authentication Method Reference Values](https://datatracker.ietf.org/doc/html/rfc8176)
- [NIST SP 800-63B-4: Reauthentication](https://pages.nist.gov/800-63-4/sp800-63b/session/#sessionreauthn)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Transaction Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)

## Conclusion

Step-up works when the resource server maps each sensitive action to explicit strength and freshness requirements, challenges for a transaction-bound proof, and limits the resulting elevation. It should reduce unnecessary prompts without letting a stolen ordinary session exercise high-impact authority.
