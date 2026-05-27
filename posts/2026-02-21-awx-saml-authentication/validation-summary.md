# Validation Summary: How to Configure AWX SAML Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWX
- Ansible Automation Platform Controller settings API
- awx.awx Ansible collection
- SAML 2.0
- Okta SAML applications
- Microsoft Entra ID SAML applications
- Keycloak SAML clients
- X.509 certificates

## Sources Consulted
- AWX Administration Guide: Setting up Enterprise Authentication - https://docs.ansible.com/projects/awx/en/24.6.1/administration/ent_auth.html
- AWX Administration Guide: Setting up Social Authentication / Organization and Team Mapping - https://docs.ansible.com/projects/awx/en/24.6.1/administration/social_auth.html
- awx.awx.settings module documentation - https://docs.ansible.com/ansible/latest/collections/awx/awx/settings_module.html
- Okta Application Integration Wizard SAML field reference - https://help.okta.com/en-us/Content/Topics/Apps/aiw-saml-reference.htm
- Okta Audience URI explanation - https://support.okta.com/help/s/article/What-Is-the-Audience-URI
- Microsoft Learn: Customize SAML token claims - https://learn.microsoft.com/en-us/entra/identity-platform/saml-claims-customization
- Microsoft Learn: Single sign-on SAML protocol - https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol
- Keycloak Server Administration Guide, SAML clients - https://www.keycloak.org/docs/latest/server_admin/
- OASIS SAML 2.0 specifications - https://docs.oasis-open.org/security/saml/v2.0/

## Issues Found
- The post used `https://awx.example.com/sso/metadata/saml/` as the AWX SAML SP Entity ID / Audience URI. AWX documentation says the SAML Service Provider Entity ID should match the AWX Base URL (`TOWER_URL_BASE`). I changed the AWX Entity ID examples, Okta Audience URI, Entra Identifier, and Keycloak Client ID to `https://awx.example.com`.
- The API `curl` example interpolated multi-line PEM certificate and key files directly into a JSON string, which would produce invalid JSON. I changed the example to build the payload with `jq --arg` and pipe valid JSON to `curl -d @-`.
- The post said AWX needs both an X.509 certificate and private key. AWX requires the public certificate for SAML metadata; the private key is optional unless signing requests or decrypting encrypted assertions is configured. I corrected that wording.
- The Ansible example loaded the IdP certificate directly from a PEM file, including headers and whitespace. AWX's documented `x509cert` value expects the IdP certificate as a single string without PEM headers. I added filters to strip the PEM headers and whitespace.
- The organization/team mapping example used unsupported `{"attr": "...", "value": [...]}` structures inside `SOCIAL_AUTH_SAML_ORGANIZATION_MAP` and `SOCIAL_AUTH_SAML_TEAM_MAP`. AWX's map settings match users by username/email patterns, while SAML attribute group mapping uses `SOCIAL_AUTH_SAML_ORGANIZATION_ATTR` and `SOCIAL_AUTH_SAML_TEAM_ATTR` with `saml_attr`, `saml_admin_attr`, and `team_org_map`. I corrected the snippet to use documented shapes.
- The troubleshooting section implied the shown log commands enable debug logging. They only inspect logs. I changed the wording to say to check logs after enabling SAML adapter logging.

## Review Notes
- The post is accurate as a general AWX SAML configuration guide after the corrections. Exact IdP URLs, claim names, and Keycloak UI labels can vary by tenant, realm, and product version, so administrators should still compare the generated AWX metadata with the IdP application before rollout.
