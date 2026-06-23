# Validation Summary: How private status pages stay secure: authentication options explained

## Status
validated

## Post Type
Guide / product how-to (OneUptime status page authentication hardening)

## Technologies Covered
- OneUptime status pages (private users, SSO, SCIM, master password, IP whitelist)
- SAML 2.0 SSO
- SCIM provisioning
- IP whitelisting (IPv4 / IPv6, CIDR)

## Sources Consulted
- OneUptime source (monorepo at `/home/simon-larsen/oneuptime/oneuptime`):
  - `Common/Models/DatabaseModels/StatusPage.ts` — `enableMasterPassword`, `masterPassword` (HashedString), `ipWhitelist` field ("One IP per line. Only used if the status page is private.")
  - `Common/Models/DatabaseModels/StatusPageSso.ts` — SAML 2.0 connection fields (signOnURL, issuerURL, publicCertificate, signature/digest methods); no OIDC fields
  - `Common/Models/DatabaseModels/StatusPageSCIM.ts`, `StatusPagePrivateUser.ts` (email-based)
  - `Common/Types/IP/IP.ts` — `isInWhitelist()`: exact match for IPv4/IPv6, CIDR matching explicitly "IPv4 only for now"
  - `Common/Server/Services/StatusPageService.ts` — splits `ipWhitelist` on newlines and calls `IP.isInWhitelist`
  - `App/FeatureSet/Dashboard/src/Pages/StatusPages/View/SideMenu.tsx` — status page menu items: Private Users, SSO, SCIM, Authentication Settings
  - `App/FeatureSet/Dashboard/src/Pages/StatusPages/View/AuthenticationSettings.tsx` — Master Password + IP Whitelist live on the Authentication Settings page; note: "When master password is enabled, SSO/SCIM and Email + Password authentication are disabled."

## Issues Found
1. **SSO claimed OIDC support.** The post said SSO works with "any SAML/OIDC provider." OneUptime status page SSO (`StatusPageSso`) is SAML 2.0 only (sign-on URL, issuer, signing certificate). Changed to describe configuring a SAML 2.0 connection, keeping Okta/Azure AD (Entra ID)/Google Workspace as SAML IdP examples.
2. **Master password "expiration date" feature does not exist.** The post instructed readers to "Set an expiration date." The `StatusPage` model has only `enableMasterPassword` and a hashed `masterPassword` — no expiry field. Rewrote to make clear rotation is manual and to schedule an external reminder. Also added the product's own constraint that enabling the master password disables SSO/SCIM and email + password sign-in.
3. **IP whitelist CIDR / IPv6 claim was inaccurate.** The post said "Add CIDR ranges ... Both IPv4 and IPv6 are supported," implying CIDR works for both. `IP.isInWhitelist` matches individual IPv4/IPv6 addresses exactly but supports CIDR ranges for IPv4 only. Clarified that entries are one per line, individual IPv4/IPv6 addresses are supported, and CIDR ranges are IPv4-only. Also corrected the navigation path (IP Whitelist lives on the Authentication Settings page, not a separate "Authentication → IP Whitelist" menu).
4. **Option 1 navigation/labels.** Private users are email-based; there is no "Username & Password" toggle to "choose." Reworded to: open the status page's Private Users settings and add users by email (each gets an email + password credential and an onboarding link to set a password). Also corrected the SSO navigation path to the status page's "SSO" settings.

## Review Notes
- The three modes are genuinely distinct: enabling the master password disables SSO/SCIM and email + password. The rollout checklist still reads as if all modes can be active simultaneously (step 2 "Enable SSO + SCIM" alongside step 3 "Generate and vault the master password"). Left the checklist intact since the post frames these as alternate paths documented in a runbook, but readers should treat master password as mutually exclusive with the other modes per the in-product note now added to Option 3.
- "Monitor mode" for IP whitelisting (checklist step 4) is an operational practice, not a literal product toggle — OneUptime's IP whitelist is enforce-only. Left as-is since it reads as a rollout recommendation rather than a feature claim.
- The referenced blog cross-link URL follows OneUptime's standard `/blog/post/.../view` pattern and was left unchanged.
