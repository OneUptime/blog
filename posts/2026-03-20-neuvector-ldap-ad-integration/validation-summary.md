# Validation Summary: How to Integrate NeuVector with LDAP/AD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector
- LDAP (Lightweight Directory Access Protocol)
- Microsoft Active Directory
- OpenLDAP
- LDAPS (LDAP over SSL/TLS)
- NeuVector REST API
- curl, jq, openssl

## Sources Consulted
- NeuVector REST API source (`controller/api/apis.go`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go (specifically `RESTServer`, `RESTServerLDAP`, `RESTServerLDAPConfig`, `RESTSystemConfigConfigData`, `RESTAuthData`)
- NeuVector REST routes (`controller/rest/rest.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/rest.go
- NeuVector server handler (`controller/rest/server.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/server.go
- NeuVector log handlers (`controller/rest/log.go`): https://github.com/neuvector/neuvector/blob/main/controller/rest/log.go
- NeuVector Microsoft AD docs: https://open-docs.neuvector.com/integration/msad/
- NeuVector LDAP integration docs: https://open-docs.neuvector.com/5.2/integration/ldap/
- Existing validated companion post `2026-03-20-neuvector-saml-sso/README.md` for the `/v1/server` API pattern.

## Issues Found

1. **Wrong API endpoint for LDAP server config (Step 2 and Step 4).** The post used `PATCH /v1/system/config` with an `ldap_config` field, but NeuVector's REST API has no such field on the system config object. LDAP/SAML/OIDC servers are managed through `/v1/server` (POST to create, PATCH `/v1/server/{name}` to update). I rewrote Step 2 to `POST /v1/server` with the correct `{"server": {"server_name": "ldap1", "server_type": "ldap", "ldap": {...}}}` envelope, and Step 4 to `PATCH /v1/server/ldap1` with `{"config": {"name": "ldap1", "ldap": {...}}}`.

2. **Wrong JSON field name `directory_type`.** The actual JSON tag in `RESTServerLDAP` / `RESTServerLDAPConfig` is `directory`, not `directory_type`. Renamed in both AD and OpenLDAP examples.

3. **Invalid JSON field name `fn_get_user_groups`.** This field does not exist in the NeuVector API. The correct field is `group_member_attr`. Renamed in both examples.

4. **Wrong value `memberOf` for `group_member_attr`.** `memberOf` is the back-link attribute *on user objects* in AD, not the membership attribute on group objects. NeuVector's `group_member_attr` is the attribute on the group entry that lists members. Set to `member` for Microsoft AD (standard groupOfNames behavior) and `memberUid` for OpenLDAP (standard posixGroup behavior).

5. **Step 7 referenced non-existent server name `"ldap"` in `auth_order`.** `auth_order` takes server names that have been registered via `/v1/server`. Updated to use `"ldap1"` consistent with the server name created in Step 2.

6. **Step 8 used non-existent endpoint `/v1/audit?type=login`.** The NeuVector REST router only exposes `/v1/log/audit`, `/v1/log/event`, `/v1/log/activity`, etc. Authentication events (login successes/failures) are written via `authLog` as `CLUSEventLog` entries, which are surfaced via `/v1/log/event` (response wrapper `events`), not `/v1/log/audit`. Updated the endpoint to `/v1/log/event` and adjusted the jq projection to use the actual `Event` fields (`name`, `msg`, `host_name`, `reported_timestamp`).

7. **Step 4 told users to enter "the full DN of the LDAP group".** NeuVector's group mapping matches against the group's common name (CN) as surfaced through the LDAP search, not the full DN. Updated both the JSON example values and the UI instructions to use plain CN names, and added a clarifying sentence.

8. **Step 1 listed an `LDAP filter`-style "User Filter" / "Group Filter" with `{0}` placeholders.** NeuVector does not accept filter expressions; it constructs the lookup itself from the `username_attr`/`group_member_attr`/`base_dn`/`group_dn`. Replaced with the actual attribute names the user needs to gather.

## Review Notes

- The post uses `https://neuvector-manager:8443` as the API host. This is the NeuVector Manager (UI) endpoint, which proxies REST calls. It matches the convention used in the already-validated SAML SSO companion post in this same blog series, so I left it unchanged. The dedicated controller REST port (default 10443) is also valid in deployments where the controller is exposed.
- The LDAPS guidance in Step 6 is generic and conceptually correct, but NeuVector's UI/API for adding a CA certificate to its trust store is not exposed via a documented REST field on `RESTServerLDAP`; trust is typically established via the controller's container CA bundle. The intentionally non-prescriptive wording in the post is fine.
- The post does not specify a NeuVector version. The field names verified above match the current `main` branch (5.x). If a 4.x reader follows the guide, the API surface is the same for these endpoints, but `group_mapped_roles` was introduced in 4.2 superseding the deprecated `role_groups` field — the post correctly uses the modern field.
- The `default_role: ""` value (empty string) is the documented way to express "no default role"; users not in a mapped group will fail to log in unless a non-empty `default_role` is set. Worth keeping in mind for readers but the post does not need to call this out.
