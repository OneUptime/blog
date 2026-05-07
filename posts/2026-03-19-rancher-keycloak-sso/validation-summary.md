# Validation Summary: How to Configure Keycloak SSO with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Keycloak
- SAML 2.0
- Kubernetes
- kubectl
- OpenSSL

## Sources Consulted
- Rancher documentation, "Configure Keycloak (SAML)": https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-keycloak-saml
- Rancher documentation, "Global Permissions": https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Kubernetes documentation, `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post set `Force POST Binding` to `ON`. Rancher's current Keycloak SAML documentation explicitly calls out that `Force POST Binding` should be `OFF` when troubleshooting failed redirects. I changed it to `OFF`.
- The post omitted two important SAML client toggles that Rancher troubleshooting depends on: `Client Signature Required: OFF` and `Encrypt Assertions: OFF`. I added both because Rancher documents them as the fixes for `invalid requester` (`SigAlg was null`) and `failed to process response` errors.
- The metadata step used the realm descriptor endpoint as the primary method, but Rancher's current guidance is to export `metadata.xml` from the client Installation tab in `SAML Metadata IDPSSODescriptor` format. I changed the primary instructions to that export flow and added the `EntityDescriptor` vs `EntitiesDescriptor` caveat for the realm endpoint alternative.
- The Rancher configuration example was missing the `Private Key / Certificate` pair that Rancher documents as part of the Keycloak SAML configuration. I added the documented `openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048` example and included the field in the Rancher snippet.
- The troubleshooting commands used a fixed `app=keycloak` selector, which is not a portable assumption across Keycloak deployments. I changed the Keycloak log example to use explicit namespace/pod placeholders and updated the Rancher log example to a deployment-based command.
- The common issues table was incomplete for current Rancher-documented failure modes. I added the documented `Force POST Binding`, `Client Signature Required`, and `Encrypt Assertions` remediation guidance.

## Review Notes
- The post's custom SAML attribute mapper names (`displayName`, `userName`, `uid`, `groups`) are technically valid as long as the Rancher field mappings match them, so they were left intact.
- Rancher still documents Keycloak SAML as supported in current releases, so the post remains technically relevant.
- Keycloak UI labels can vary slightly by version, but the corrected workflow and field names are consistent with current official documentation.
