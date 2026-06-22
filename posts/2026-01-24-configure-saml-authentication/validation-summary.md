# Validation Summary: How to Configure SAML Authentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SAML 2.0
- Single Sign-On (SSO)
- Node.js, Express, Passport, @node-saml/passport-saml
- Python, Flask, python3-saml / OneLogin SAML Python Toolkit
- Okta SAML app integrations
- Microsoft Entra ID SAML applications and Microsoft Graph PowerShell
- SAML metadata, assertions, AuthnRequest, ACS, SLO, signature validation, attribute mapping

## Sources Consulted
- Node-SAML Passport-SAML README: https://github.com/node-saml/passport-saml
- Node-SAML README and configuration reference: https://github.com/node-saml/node-saml
- OneLogin python3-saml README and settings examples: https://github.com/SAML-Toolkits/python3-saml
- Okta SAML app integration guide: https://developer.okta.com/docs/guides/create-an-app-integration/saml2/main/
- Microsoft Graph SAML SSO configuration guide: https://learn.microsoft.com/en-us/graph/application-saml-sso-configure-api
- Microsoft Graph applicationTemplate resource reference: https://learn.microsoft.com/en-us/graph/api/resources/applicationtemplate
- OASIS SAML 2.0 Technical Overview: https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html
- OASIS SAML 2.0 Metadata specification: https://docs.oasis-open.org/security/saml/v2.0/saml-metadata-2.0-os.pdf

## Issues Found
- The Node.js example used the older `passport-saml` package name and `require('passport-saml')`. Updated it to the current `@node-saml/passport-saml` package and import path.
- The Node.js strategy used `cert` for the IdP signing certificate. Updated it to `idpCert`, matching current Node-SAML configuration.
- The Node.js examples used boolean `validateInResponseTo` values. Updated them to current Node-SAML values: `always`, `never`, and `ifPresent`.
- The Node.js metadata endpoint called `generateServiceProviderMetadata()` without the SP public certificate even though a private key may be configured. Updated the call to pass the public certificate.
- The IdP-initiated SSO conditional example mutated strategy options at request time and detected `InResponseTo` with a string search. Replaced it with a dedicated strategy using `validateInResponseTo: 'ifPresent'`.
- The Azure AD PowerShell example used the older AzureAD module and created an app/service principal without setting SAML SSO mode. Updated it to Microsoft Graph PowerShell, the non-gallery application template ID, `preferredSingleSignOnMode = "saml"`, and application `identifierUris` / `web.redirectUris`.
- The Node.js SAML debug helper used `DOMParser` without defining it. Added the `@xmldom/xmldom` dependency note and import.
- The secure Node-SAML config used `authnRequestsSigned`, which is not the current Node-SAML option for signing requests. Replaced it with `privateKey` and `publicCert`, and added `idpCert` for IdP signature validation.

## Review Notes
- The Python `python3-saml` settings structure and security option names match the OneLogin toolkit examples.
- Okta field names and SAML app configuration flow match Okta documentation.
- The post remains a broad tutorial; production systems should still add tenant-specific certificate rotation, distributed request ID cache storage for `InResponseTo` validation, CSRF/session hardening, and careful handling of IdP-initiated SSO.
