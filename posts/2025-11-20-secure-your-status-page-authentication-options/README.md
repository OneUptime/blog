# How private status pages stay secure: authentication options explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Status Page, Security, Identity

Description: Hardening a OneUptime status page by choosing the right authentication mode - per-user username/password accounts, SSO + SCIM.

---

Status pages no longer live only on the public web. Many of us now maintain internal, customer-specific, or NDA-protected pages where we share sensitive recovery notes, customer-specific impact, or compliance artifacts. That means the page itself must be treated like a production system: authenticated, audited, and locked to the networks you trust.

This guide walks through the three distinct authentication modes OneUptime ships for status pages - username/password, SSO with SCIM, and the master password - and shows how to add IP whitelisting so only known networks can even reach the login form.

---

## Why authentication choice matters

- **Incidents expose sensitive detail.** RFO timelines, ticket links, and workaround notes should never leak to the public internet.
- **Enterprise customers expect parity with their IdP.** Security questionnaires routinely ask whether you can enforce SSO, SCIM provisioning, and MFA.
- **Network-origin filtering reduces credential risk.** Even strong auth can be brute-forced if it’s reachable from everywhere; IP policies shrink the attack surface.
- **Audit answers come faster.** When every login is traceable to an identity provider and a known network, compliance teams stop chasing down spreadsheets.

If you are still deciding between public or private pages, start with [Create a Private Status Page with OneUptime](https://oneuptime.com/blog/post/2025-10-27-create-a-private-status-page-with-oneuptime/view) and then return here to harden access.

---

## Option 1: Username / Password accounts

This is the default for quick pilots or smaller teams.

Each status-page user gets their own credential pair - no shared logins - so you can disable individual access without touching other accounts.

1. In your OneUptime project, open the status page's **Private Users** settings.
2. Add users by email - each private user gets their own email + password credential. They receive onboarding links to set a password.

**When to use it:** early-stage rollouts, contractor access where IdP federation is overkill.

**Hardening tips:** disable dormant accounts, and pair with IP whitelisting so even compromised credentials cannot be abused from unknown networks.

---

## Option 2: SSO + SCIM (recommended for production)

Single Sign-On brings your page under the same policies as the rest of your stack - MFA, device posture, conditional access. SCIM keeps membership current so offboarding is instant.

1. Open the status page's **SSO** settings and configure a SAML 2.0 connection - the sign-on URL, issuer, and signing certificate from any SAML 2.0 identity provider such as Okta, Azure AD (Entra ID), or Google Workspace.
2. Open the **SCIM** settings and enable provisioning so adds/removes in the source directory sync automatically. Dormant emails disappear without manual cleanup.
3. Test with a pilot group before rolling out to all users.

**Benefits:**

- Centralized MFA, session lifetime, and anomaly detection.
- Automatic deprovisioning when someone leaves the company.
- User activity is stamped with IdP identifiers for compliance.


---

## Option 3: Master Password for controlled broadcast

The master password is a one-to-many secret meant for deliberate, time-bound sharing - think executive briefings, investor updates, or incident bridges where dozens of people need immediate read-only access.

1. On the status page's **Authentication Settings** page, set a **Master Password**. It is stored as a secure hash and cannot be retrieved, so treat it like any production secret. Note that enabling the master password disables SSO/SCIM and email + password sign-in for that page.
2. Schedule your own reminder to rotate it after major incidents or staff changes - rotation is manual, since there is no built-in expiration date.
3. Distribute it out-of-band (secure chat, encrypted email) and remind recipients not to reuse it elsewhere.

**When to reach for it:**

- Running large-scale incident drills where external auditors must observe.
- Sharing updates with a partner who lacks accounts but needs temporary access.
- Broadcasting the same view to a wide group without creating or syncing individual accounts.

---

## Add IP whitelisting for network trust

Authentication handles *who* is logging in. IP whitelisting adds a control around *where* that login originates.

1. Go to the status page's **Authentication Settings** page and edit the **IP Whitelist**.
2. Add the addresses for corporate offices, VPN gateways, or customer-owned network blocks, one entry per line. Individual IPv4 and IPv6 addresses are supported, as are IPv4 CIDR ranges (CIDR ranges are IPv4-only).
3. Test from inside and outside the allowed range to confirm the block is enforced before announcing the change.

---

## Putting it together: rollout checklist

1. **Inventory users** who need access and decide which should live in SSO groups vs. username/password.
2. **Enable SSO + SCIM**, test with a pilot group, and keep at least two break-glass local admins.
3. **Generate and vault** the master password; rotate it after every major external sharing event.
4. **Configure IP whitelisting** in monitor mode, review logs for a week, then switch to enforcement.
5. **Document the flow** inside your incident runbook so responders know which path to use when inviting stakeholders.
6. **Simulate failure modes** (IdP outage, VPN failover) so you know which guardrails to relax temporarily and how to log the exception.

With these controls in place, your status page stops being a liability and becomes a verified, access-controlled source of truth for every audience you serve.
