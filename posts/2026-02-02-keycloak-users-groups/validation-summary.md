# Validation Summary: How to Configure Keycloak Users and Groups

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Keycloak (Admin Console, Admin CLI / `kcadm.sh`, Admin REST API)
- OpenID Connect protocol mappers (`oidc-usermodel-attribute-mapper`, `oidc-group-membership-mapper`)
- LDAP / Active Directory user federation and group mappers
- Keycloak realm authentication settings (required actions, brute-force protection, session timeouts, password policies)
- `python-keycloak` SDK (`KeycloakAdmin`, `KeycloakOpenIDConnection`)
- `gocloak/v13` Go SDK
- `curl` + `jq` for REST API scripting
- Bash scripting

## Sources Consulted
- Keycloak Server Administration Guide — https://www.keycloak.org/docs/latest/server_admin/
- Keycloak Admin REST API reference — https://www.keycloak.org/docs-api/latest/rest-api/index.html
- `RealmRepresentation` Javadoc (26.x) — https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/representations/idm/RealmRepresentation.html
- `GroupMembershipMapper` Javadoc — https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/GroupMembershipMapper.html
- Keycloak issue on filtering events by user id — https://github.com/keycloak/keycloak/issues/35048
- `python-keycloak` API reference — https://python-keycloak.readthedocs.io/en/latest/reference/keycloak/keycloak_admin/
- `gocloak/v13` Go package reference — https://pkg.go.dev/github.com/Nerzal/gocloak/v13

## Issues Found

1. **Events API used a username instead of a user ID.** The `Audit User Events` section queried `events?user=alice&type=LOGIN`. The Keycloak Admin REST API's `user` query parameter on `/events` expects a user UUID, not a username, so the original example would return no results. Fixed by first resolving the user ID via `kcadm.sh get users -q username=alice` and then passing `$USER_ID` to the events query.

2. **Realm-level `requiredActions` setting did not match the API contract.** The post originally set `requiredActions=["VERIFY_EMAIL", "UPDATE_PASSWORD"]` via `kcadm.sh update realms/mycompany`. `RealmRepresentation.requiredActions` is typed as `List<RequiredActionProviderRepresentation>` (full provider objects), not a list of alias strings, and is not how default actions are enabled for new users. Replaced with the correct per-provider approach: `kcadm.sh update authentication/required-actions/<ALIAS> -s defaultAction=true -s enabled=true` for `VERIFY_EMAIL` and `UPDATE_PASSWORD`. The `defaultDefaultClientScopes` update was preserved as its own command (it is a real field).

3. **"Include Group Attributes in Tokens" section actually showed a group membership mapper.** The `oidc-group-membership-mapper` only outputs the list of groups a user belongs to; it does not include any custom group attributes. There is no built-in mapper for group attributes — that needs a script mapper or custom protocol mapper SPI. Renamed the section to "Include Group Membership in Tokens", renamed the mapper instance accordingly, and added a sentence noting that custom group-attribute claims require a script mapper or SPI.

## Review Notes

- The `kcadm.sh update users/$USER_ID/groups/$GROUP_ID -r mycompany -s realm=mycompany -n` pattern for adding a user to a group is quirky but is the community-documented form and matches what the kcadm tool accepts.
- The `python-keycloak` `change_current_realm()` method was added in 2.x; the example is fine for modern versions but would not work on very old releases.
- `gocloak/v13` method signatures all match current upstream and are stable.
- The LDAP `userObjectClasses` config uses the `["person, organizationalPerson, user"]` form (a single comma-separated string inside the array). This is the documented Keycloak convention for multi-valued config strings and is correct.
- The realm field name `defaultDefaultClientScopes` is intentionally double-named in Keycloak (default client scopes assigned to new clients in the realm) and is correct as shown.
