# Validation Summary: How to Enable Two-Factor Authentication in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Keycloak
- Microsoft Entra ID (Azure AD)
- Okta
- GitHub Organizations
- OAuth2 Proxy
- Kubernetes
- NGINX Ingress
- Bash
- YAML

## Sources Consulted
- Rancher authentication overview: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher local authentication: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/create-local-users
- Rancher GitHub auth: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-github
- Rancher Azure AD auth: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-azure-ad
- Rancher Keycloak OIDC auth: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-keycloak-oidc
- Rancher Okta SAML auth: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-okta-saml
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Microsoft Entra Conditional Access docs: https://learn.microsoft.com/en-us/entra/identity/authentication/tutorial-enable-azure-mfa
- Microsoft Entra target resources docs: https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps
- Microsoft Entra authentication methods docs: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-oath-tokens
- Okta authenticator enrollment policies: https://help.okta.com/oie/en-us/Content/Topics/identity-engine/policies/about-mfa-enrollment-policies.htm
- Okta app sign-in policies: https://help.okta.com/oie/en-us/Content/Topics/identity-engine/policies/about-app-sign-on-policies.htm
- Okta app sign-in policy rules: https://help.okta.com/oie/en-us/Content/Topics/identity-engine/policies/add-app-sign-on-policy-rule.htm
- Okta YubiKey OTP authenticator: https://help.okta.com/oie/en-us/content/topics/identity-engine/authenticators/configure-yubikey-otp.htm
- GitHub organization 2FA requirement: https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-two-factor-authentication-for-your-organization/requiring-two-factor-authentication-in-your-organization
- GitHub org members REST API: https://docs.github.com/rest/orgs/members
- OAuth2 Proxy NGINX integration: https://oauth2-proxy.github.io/oauth2-proxy/configuration/integrations/nginx/
- OAuth2 Proxy Keycloak OIDC provider: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/keycloak_oidc/
- OAuth2 Proxy configuration overview: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview
- OAuth2 Proxy endpoints: https://oauth2-proxy.github.io/oauth2-proxy/features/endpoints/
- ingress-nginx external OAuth auth example: https://kubernetes.github.io/ingress-nginx/examples/auth/oauth-external-auth/

## Issues Found
- The Keycloak browser-flow section instructed readers to duplicate the Browser flow and add an unconditional OTP form. Current Keycloak documentation already includes a built-in conditional 2FA subflow in the default Browser flow, so I replaced that section with the documented flow structure and removed the unnecessary rebinding step.
- The Keycloak OTP policy field name used `Look Ahead Window`, but the current Keycloak docs use `Look Around Window`. I corrected the field name.
- The Azure AD section used outdated Microsoft terminology and Conditional Access labels. I updated it to Microsoft Entra ID wording and corrected the policy target from an app registration to the enterprise application / target resource used by Conditional Access.
- The Okta section used older `Security > Multifactor` terminology and an outdated sign-on rule description. I updated it to current Okta Identity Engine terminology for authenticators, enrollment, and app sign-in policies.
- The GitHub section incorrectly stated that non-compliant members are removed after a grace period. Current GitHub docs say members and billing managers retain membership but lose access, while outside collaborators are removed. I corrected the behavior and removed the unsupported grace-period instruction.
- The OAuth2 Proxy example was incomplete for ingress-nginx external auth. It was missing a Service, a redirect URL, `--reverse-proxy=true`, a non-loopback listen address, and a separate `/oauth2` ingress path. I corrected the manifests to match the documented ingress-nginx / OAuth2 Proxy pattern and clarified that this is an additional front-door control, not true MFA for Rancher local accounts.
- The GitHub API and Rancher log commands were updated to current documented forms, including recommended GitHub API headers and a more reliable `deploy/rancher` log target.

## Review Notes
- Rancher's own UI and docs still use `AzureAD` / `Azure AD` in several places even though Microsoft now brands the service as Microsoft Entra ID; the post now reflects both names where helpful.
- The reverse-proxy method still depends on an upstream OIDC provider that enforces MFA. It should be treated as a gateway in front of Rancher, not as native 2FA for Rancher's local user database.
- Okta admin labels vary slightly between Classic Engine and Identity Engine. The corrected steps align with current Identity Engine documentation, which is the more up-to-date reference.
