# Validation Summary: Stop Paywalling Security: SSO Is a Basic Right, Not an Enterprise Perk

## Status
not-code-blog

## Post Type
Opinion piece / advocacy (product positioning)

## Technologies Covered
- SSO (Single Sign-On)
- SAML
- OIDC (OpenID Connect)
- SCIM (System for Cross-domain Identity Management)
- 2FA / MFA (Two-Factor / Multi-Factor Authentication)

## Sources Consulted
- The post contains no code, CLI commands, or configuration snippets to verify. Only the conceptual descriptions of the named identity technologies were sanity-checked against general knowledge of:
  - SCIM (RFC 7643 / RFC 7644) — automated user provisioning/deprovisioning lifecycle
  - SAML 2.0 and OpenID Connect — standard SSO/federation protocols
  - sso.tax (https://sso.tax/) — the referenced site cataloging SSO-as-upsell pricing

## Issues Found
No technical issues found. This is an opinion/advocacy piece arguing that SSO, SCIM, and 2FA should be baseline (free) rather than enterprise-gated. It contains no code examples, terminal commands, or configuration snippets that require technical validation.

The conceptual statements that are present are accurate:
- SCIM does automate the provisioning lifecycle (create / update / disable accounts).
- SSO does reduce credential sprawl and centralize offboarding via the IdP.
- 2FA/MFA does mitigate common account-takeover paths.
- SAML and OIDC are the standard SSO protocols.

## Review Notes
None. The post is non-technical (no implementation details to maintain), so there is no version-specific or deprecation risk to flag.
