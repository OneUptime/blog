# Validation Summary: How to Use a Non-Default Admin Username in Portainer

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Portainer (Community Edition and Business Edition)
- Portainer HTTP API (`/api/users/admin/init`, `/api/auth`, `/api/users`)
- curl
- jq
- LDAP authentication (Portainer BE)

## Sources Consulted
- [Portainer API Documentation](https://docs.portainer.io/api/docs)
- [Portainer API usage examples](https://docs.portainer.io/api/examples)
- [Accessing the Portainer API](https://docs.portainer.io/api/access)
- [Portainer Users documentation](https://docs.portainer.io/admin/user/users)
- [Portainer Add a new user](https://docs.portainer.io/admin/user/add)
- [Portainer LDAP Authentication](https://docs.portainer.io/admin/settings/authentication/ldap)
- [Portainer CE vs BE comparison](https://www.portainer.io/blog/portainer-community-edition-ce-vs-portainer-business-edition-be-whats-the-difference)

## Issues Found
No technical issues found.

Verified specifically:
- `POST /api/users/admin/init` is the correct endpoint for initial admin creation, and accepts a JSON body with `Username` and `Password` fields.
- `POST /api/auth` is the correct authentication endpoint and returns a JWT in the `jwt` field.
- `POST /api/users` is the correct endpoint to create additional users; `Role: 1` corresponds to Administrator (Role 2 = Standard User).
- Default Portainer HTTPS port is `9443`.
- LDAP authentication is correctly described as a Portainer Business Edition (BE) feature.
- Field name casing (mix of `Username`/`username`) works because Portainer is built in Go and Go's `encoding/json` is case-insensitive when unmarshaling, so both forms are accepted by the API.
- The `jq` filters using `.Username` and `.Id` correctly match the JSON tags returned by the Portainer User struct.

## Review Notes
- The `/api/users/admin/init` endpoint is only usable during the initial setup window (typically ~5 minutes after Portainer first starts) before any admin exists. The post correctly notes that the custom admin username can only be set during initial setup, but does not explicitly mention this short timeout window — readers automating bootstrap should be aware.
- The post frames "security through obscurity" as a first line of defense, which is technically accurate framing — it should not be relied upon alone. The post does correctly recommend strong passwords, lockouts, and rotation in the "Other Username Security Tips" section.
- The hardcoded passwords in the API examples are illustrative only; readers should obviously substitute their own.
