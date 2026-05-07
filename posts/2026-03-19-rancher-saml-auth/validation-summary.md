# Validation Summary: How to Configure SAML Authentication in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- SAML 2.0
- Single sign-on (SSO)
- Kubernetes
- Identity providers: Microsoft AD FS, PingIdentity, Keycloak, Okta, Shibboleth

## Sources Consulted
- Rancher: Configuring Authentication - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Rancher: Configure Keycloak (SAML) - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-keycloak-saml
- Rancher: Configure PingIdentity (SAML) - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-pingidentity
- Rancher: Configure Okta (SAML) - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-okta-saml
- Rancher: Configuring Microsoft Active Directory Federation Service (SAML) - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/configure-microsoft-ad-federation-service-saml
- Rancher: Configuring Rancher for Microsoft AD FS - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/configure-microsoft-ad-federation-service-saml/configure-rancher-for-ms-adfs
- Rancher: Configuring Shibboleth (SAML) - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/configure-shibboleth-saml
- Rancher: Global Permissions - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions

## Issues Found
- The post described Rancher SAML as working with "any SAML 2.0 identity provider". Rancher documents provider-specific SAML integrations instead of a generic SAML provider, so the description and prerequisite language were corrected to reference Rancher's supported SAML providers.
- Step 1 implied the Rancher SP metadata could always be fetched first. Rancher documents that PingIdentity, Keycloak SAML, and Shibboleth metadata endpoints do not return valid data until the authentication configuration has been saved, so that caveat was added.
- Step 2 treated Entity ID, ACS, SLO, and attribute names as generic fixed values. Rancher documents provider-specific endpoint names and IdP-specific attribute mappings, so the wording was corrected to make the claim names and field values provider-dependent.
- Step 4 listed a generic SLO URL extracted from IdP metadata. That was removed because Rancher's current provider docs focus on IdP metadata XML plus Rancher-side SLO behavior, not a single generic SLO URL that applies across providers.
- Step 4 omitted a Keycloak-specific metadata caveat. Rancher documents that Keycloak metadata may need `EntityDescriptor` instead of `EntitiesDescriptor`, so that note was added.
- Step 5 omitted the `Private Key / Certificate` field, which Rancher documents for its SAML providers, and it suggested a generic manual field-entry path instead of the metadata-driven flow documented by Rancher. The configuration block was corrected accordingly.
- Step 6 said to search for a SAML group directly. Rancher documents that SAML users and groups are not generally searchable/validated the way LDAP-backed providers are, and that permissions are assigned from groups returned in the SAML response, so the instructions were corrected to reflect drop-down selection behavior.
- Step 7 and Step 8 described a separate `Test` action before `Enable`. Rancher's current SAML provider docs describe clicking `Enable`, authenticating with the IdP, and validating the configuration as part of that enable flow. The post was updated to match that behavior.
- Step 7 did not mention that the external account used during enablement is granted admin permissions. Rancher documents this explicitly, so the warning was added.
- Step 9 hardcoded a Rancher SLO endpoint and binding. Rancher's provider docs instead document Rancher's `Log Out behavior` options and note that they only appear when the provider supports SAML SLO, so the section was corrected.
- Step 10 included a command that claimed to count successful SAML logins by grepping for `saml.*success`. That log pattern is not documented by Rancher, so it was replaced with a safer log-inspection example.

## Review Notes
- Rancher v2.6 is now archived in the official documentation, but the SAML flows reviewed here remain documented in current provider-specific guides and still use the same Rancher endpoint patterns.
- Field names such as `UID Field`, `User Name Field`, and `Groups Field` vary significantly by identity provider and backing directory. The post now reflects that they must match the actual claims emitted by the IdP.
