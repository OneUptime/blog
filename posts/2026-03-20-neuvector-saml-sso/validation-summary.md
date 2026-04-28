# Validation Summary: How to Configure NeuVector SAML SSO

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- NeuVector (SUSE container security platform)
- SAML 2.0 SSO
- Okta (identity provider)
- Azure AD / Microsoft Entra ID (identity provider)
- NeuVector REST API (`/v1/server`, `/v1/system/config`, `/v1/token_auth_server/:server`)
- Azure CLI (`az ad app`)
- curl, jq

## Sources Consulted
- NeuVector official docs — SAML (Okta): https://open-docs.neuvector.com/integration/saml/
- NeuVector official docs — SAML (Azure AD): https://open-docs.neuvector.com/integration/msazure/
- NeuVector official docs — SAML (ADFS): https://open-docs.neuvector.com/integration/adfs/
- NeuVector official docs — Users and Roles: https://open-docs.neuvector.com/configuration/users/
- NeuVector controller API source (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go (verified `RESTServerSAML`, `RESTServerSAMLConfig`, `RESTServer`, `RESTServerConfig`, `RESTServerData`, `RESTServerConfigData`, `RESTSystemConfigConfig`, `RESTToken`, `RESTUser` structs and JSON tags)
- NeuVector REST router (`controller/rest/rest.go`): verified routes `POST /v1/server`, `PATCH /v1/server/:name`, `POST /v1/token_auth_server/:server`, `PATCH /v1/system/config`
- NeuVector `share/clus_apis.go`: verified `GroupRoleMapping{Group, GlobalRole, RoleDomains}` JSON shape
- Azure CLI reference for `az ad app create`: https://learn.microsoft.com/en-us/cli/azure/ad/app (verified that the deprecated `--reply-urls` has been replaced by `--web-redirect-uris`)

## Issues Found

1. **Wrong API endpoint for SAML configuration.** The original post configured SAML by PATCHing `/v1/system/config` with a `saml_config` field. The actual NeuVector API exposes SAML servers as resources under `/v1/server` (`POST` to create, `PATCH /v1/server/{name}` to update). The system-config endpoint only carries the system-wide `auth_order` and a few unrelated fields — it has no `saml_config` field. **Fix:** rewrote the curl examples to `POST /v1/server` for the Okta case, `PATCH /v1/server/saml1` for the Azure AD and default-role updates, and split out a separate `PATCH /v1/system/config` call for `auth_order`.

2. **Wrong JSON wrapper / field name.** The post wrapped SAML settings in a `saml_config` object. NeuVector's `RESTServerConfig` uses the JSON tag `saml` (and the create-side `RESTServer` also uses `saml`, alongside `server_name` and `server_type`). **Fix:** renamed `saml_config` to `saml` and added the surrounding `server` / `config` envelope with `server_name`/`server_type`/`name` as required by the create and update structs.

3. **Non-existent fields in SAML config.** The post listed `username_claim`, `email_claim`, and `redirect_url` inside the SAML config payload. None of these exist on `RESTServerSAML` or `RESTServerSAMLConfig`. NeuVector takes username/email from the SAML NameID and standard attributes; only group lookup is configurable, via the single `group_claim` field. **Fix:** removed the three invalid fields. Set `group_claim` to NeuVector's documented default `NVRoleGroup` for Okta, and to the Microsoft groups claim URI for Azure AD.

4. **Inconsistent ACS server-name segment.** The post mixed `/v1/token_auth_server/saml` in the URLs while the NeuVector convention (and the username-prefix reservation in the source: `saml1:`) uses `saml1` as the default SAML server name. The route is `/v1/token_auth_server/:server`, so the trailing path must match the configured server name. **Fix:** standardized on `saml1` across the ACS URL examples and added a note that the user should copy the actual "SAML Redirect URL" from the NeuVector console.

5. **Deprecated Azure CLI argument.** `az ad app create --reply-urls ...` no longer works on current Azure CLI; the parameter was replaced by `--web-redirect-uris`. **Fix:** updated the command and corrected the surrounding prose to say "application registration" rather than "enterprise application", since `az ad app create` only creates the App Registration object.

6. **Misleading Okta attribute statements.** The post's example claimed NeuVector reads `username`, `email`, and `firstname` SAML attribute names directly. NeuVector reads the username from the NameID and uses the configured `group_claim` (default `NVRoleGroup`) for groups; the `firstname` attribute isn't consumed at all. **Fix:** simplified the Okta attribute mapping example to `Username`/`Email` and renamed the group attribute to `NVRoleGroup` to match NeuVector's default `group_claim`, with a short clarifying sentence below.

## Review Notes
- The `group_claim` value for Azure AD was set to the standard Microsoft groups claim URI (`http://schemas.microsoft.com/ws/2008/06/identity/claims/groups`), which is what Azure emits when "Groups assigned to the application" or "All" is configured. If the operator picks a different claim name in Azure, this string must match.
- NeuVector's documentation strongly recommends configuring SAML through the UI ("Settings > SAML Setting") or through the `samlinitcfg.yaml` ConfigMap at deployment time; the REST API path used in the post is functional but is not the most commonly documented path. This was left as-is since the post's framing is API-driven.
- The `x509_cert` field has the `cloak` JSON tag in the API; on read it is masked. This does not affect the write examples but is worth knowing if a reader tries to GET back what they posted.
- The post does not mention that NeuVector supports multiple X.509 certs (for IdP rotation) via `x509_cert_extra` on the config struct — out of scope for this tutorial, but a reasonable follow-up.
