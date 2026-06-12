# Validation Summary: How to Implement Keycloak SSO

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- Keycloak
- Single Sign-On (SSO)
- OpenID Connect (OIDC)
- OAuth 2.0
- SAML 2.0
- Keycloak Admin CLI (`kcadm.sh`)
- Keycloak JavaScript adapter (`keycloak-js`)
- Keycloak Node.js adapter (`keycloak-connect`)
- Express / Node.js
- Flask / Python
- OneLogin Python SAML Toolkit
- Keycloak Event Listener SPI
- OIDC front-channel and back-channel logout

## Sources Consulted
- Keycloak JavaScript adapter documentation: https://www.keycloak.org/securing-apps/javascript-adapter
- Keycloak Node.js adapter documentation: https://www.keycloak.org/securing-apps/nodejs-adapter
- Keycloak Server Administration Guide, Admin CLI client and session operations: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak Server Developer Guide, identity provider account linking: https://www.keycloak.org/docs/latest/server_development/index.html
- Keycloak Admin REST API reference: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- Keycloak latest Javadocs, `EventListenerProvider`: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/events/EventListenerProvider.html
- Keycloak latest Javadocs, configuration constant values: https://www.keycloak.org/docs-api/latest/javadocs/constant-values.html
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Back-Channel Logout 1.0: https://openid.net/specs/openid-connect-backchannel-1_0.html
- OAuth 2.0 RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749
- JSON Web Token RFC 7519: https://datatracker.ietf.org/doc/html/rfc7519
- OASIS SAML 2.0 Technical Overview: https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html
- OASIS SAML 2.0 Bindings: https://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf
- OneLogin Python SAML Toolkit documentation and Flask demo: https://github.com/SAML-Toolkits/python3-saml

## Issues Found
- Several snippets were fenced as `json` even though they contained comments. Changed those fences to `jsonc` and clarified that the OIDC client export excerpt must have comments removed before import.
- The protocol comparison table described OIDC transport as `REST/JSON` and SAML transport as `SOAP/XML`, which is incomplete for browser SSO. Updated it to describe OIDC as HTTPS redirects plus JSON endpoints, and SAML as HTTP Redirect/POST, HTTP Artifact, or SOAP bindings.
- The account-linking Java example used Keycloak's legacy client-initiated account-link endpoint without the required `hash` parameter. Added nonce/hash generation calls and included the `hash` query parameter.
- The Keycloak event listener example implemented only user-event handling. Added the required admin-event handler and `close()` method from `EventListenerProvider`.
- The OIDC back-channel logout example treated the logout token `sid` as a local Express session ID. Updated it to use the OIDC session ID to look up the corresponding local application session before destroying it.
- The best-practice note to "Use official adapters" was too broad because Keycloak has moved toward standard libraries and supported adapters depending on platform. Updated it to recommend maintained OIDC/SAML libraries or supported Keycloak adapters.

## Review Notes
- The Node.js `keycloak-connect` example matches current Keycloak documentation, but Keycloak has previously announced a gradual move away from bespoke adapters. Future revisions may be stronger if they show a generic OIDC library such as an OpenID-certified client for new Node.js applications.
- The account-linking example still demonstrates the legacy client-initiated URL pattern. Keycloak's current documentation recommends application-initiated actions with `kc_action=idp_link:<provider>` for new applications.
