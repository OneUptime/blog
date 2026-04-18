# Validation Summary: How to Troubleshoot LDAP Authentication Issues in Portainer - Authentication

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Portainer (Business Edition container image)
- LDAP / LDAPS (OpenLDAP client tools: ldapwhoami, ldapsearch)
- TLS / StartTLS
- OpenSSL s_client
- netcat (nc) for port connectivity testing
- Docker (container management)
- Portainer REST API (JWT Bearer auth)

## Sources Consulted
- OpenLDAP man pages for ldapwhoami and ldapsearch (`-H`, `-x`, `-D`, `-w`, `-Z`/`-ZZ`, `-b` flags)
- Red Hat knowledge base on StartTLS vs LDAPS interaction (https://access.redhat.com/solutions/459683)
- Portainer CLI docs — `--log-level` flag and accepted values (https://docs.portainer.io/sts/advanced/cli)
- Portainer API documentation (https://docs.portainer.io/api/docs) — `/api/teams` endpoint and Bearer token auth
- OpenSSL s_client documentation for `-starttls ldap` on port 389
- netcat documentation for `-z` scan-only and `-v` verbose flags

## Issues Found
1. **`-ZZ` (StartTLS) used with an `ldaps://` URL** in the "Invalid credentials" section's `ldapwhoami` example. StartTLS is an extended operation that upgrades a plain LDAP connection (port 389) to TLS; it is incompatible with `ldaps://`, which is already TLS from the initial handshake on port 636. Combining them causes the client to fail or produce an error. **Fix:** removed the `-ZZ` flag so the command uses the LDAPS connection cleanly. The StartTLS variant is still demonstrated correctly in the "TLS/SSL Connection Errors" section via `openssl s_client -starttls ldap` on port 389.

## Review Notes
- The DN-construction explanation (`<UserNameAttribute>=<username>,<BaseDN>`) reflects Portainer's "simple" / auto-populated LDAP configuration. Portainer also supports a search-filter based mode where the reader DN first locates the user DN before binding; the post's guidance is still accurate for the common simple-mode setup.
- `portainer/portainer-ee:latest` is the Business Edition image; the same `--log-level DEBUG` flag also works for `portainer/portainer-ce`, so readers on Community Edition can apply the same approach.
- The Python one-liner uses a list comprehension for side effects, which works but is not idiomatic; left as-is since it is technically correct and in the author's style.
