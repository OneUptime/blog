# Validation Summary: How to Configure MFA for ArgoCD Access

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Dex
- OpenID Connect
- Keycloak
- Okta
- Microsoft Entra ID
- Google Workspace
- Authelia
- authentik
- WebAuthn / FIDO2
- PrometheusRule
- Argo CD CLI

## Sources Consulted
- Argo CD user management and SSO documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex Google connector documentation: https://dexidp.io/docs/connectors/google/
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Keycloak Conditional OTP authenticator API documentation: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/authentication/authenticators/browser/ConditionalOtpFormAuthenticator.html
- Okta sign-on policy documentation: https://help.okta.com/en-us/content/topics/security/policies/about-signon-policies.htm
- Okta step-up authentication with ACR values documentation: https://developer.okta.com/docs/guides/step-up-authentication/-/main/
- Microsoft Entra Conditional Access MFA documentation: https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-mfa-strength
- Google Workspace 2-Step Verification deployment documentation: https://support.google.com/a/answer/9176657
- Authelia TOTP documentation: https://www.authelia.com/configuration/second-factor/time-based-one-time-password/
- Authelia WebAuthn documentation: https://www.authelia.com/configuration/second-factor/webauthn/
- Authelia access control documentation: https://www.authelia.com/configuration/security/access-control/
- authentik Authenticator Validation stage documentation: https://docs.goauthentik.io/add-secure-apps/flows-stages/stages/authenticator_validate/
- OpenID Connect Core 1.0 specification: https://openid.net/specs/openid-connect-core-1_0-18.html

## Issues Found
- The Keycloak `acr` explanation implied Keycloak automatically sets token evidence purely from the completed flow. Updated it to note that Keycloak needs ACR/LoA mapping and the `acr` client scope for token-level evidence.
- The Okta Dex snippet implied the shown Dex connector was requesting MFA through ACR values. Updated the comment to clarify that the example relies on the Okta app sign-in policy, while direct OIDC clients can request Okta ACR values separately.
- The Dex Google connector used `adminEmail`, which is not the documented field for Google group fetching. Replaced it with `domainToAdminEmail`.
- The Authelia WebAuthn snippet placed `user_verification` at the top level. Moved it under `selection_criteria`, matching current Authelia configuration.
- The monitoring example used Argo CD application reconciliation/sync metrics as a proxy for authentication failures. Replaced it with an IdP-exported MFA failure metric placeholder and clarified that Argo CD application metrics do not directly report MFA challenge outcomes.

## Review Notes
- The remaining provider setup steps are intentionally high-level and UI names can vary between product editions and release versions.
- The Prometheus alert now uses a placeholder IdP metric name; teams should replace it with the metric or log-derived counter exposed by their chosen identity provider or observability pipeline.
