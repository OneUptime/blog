# Validation Summary: How to Troubleshoot LDAP Authentication Issues in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- LDAP / OpenLDAP
- LDAPS / StartTLS / TLS certificates
- Docker CLI
- Portainer HTTP API
- `ldapsearch`
- OpenSSL `s_client`

## Sources Consulted
- Portainer LDAP authentication documentation: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer troubleshooting FAQ for server logs: https://docs.portainer.io/sts/faqs/troubleshooting/logs-errors-and-debugging/how-can-i-get-the-logs-for-portainer-itself
- Portainer source: `api/portainer.go` (`LDAPSettings` and `Settings` response model), official repository: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: auth handler returning `jwt`, official repository: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: settings inspect handler and API security definitions, official repository: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_inspect.go
- Portainer source: API security header names, official repository: https://github.com/portainer/portainer/blob/develop/api/http/handler/handler.go
- Portainer source: LDAP auth flow and connectivity testing, official repository: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer source: log level handling, official repository: https://github.com/portainer/portainer/blob/develop/api/logs/log.go
- GNU Wget manual: https://www.gnu.org/software/wget/manual/wget.html
- OpenSSL `s_client` documentation: https://docs.openssl.org/1.1.1/man1/s_client/

## Issues Found
- The post used `wget -q --spider ldap://...` as an LDAP connectivity check. GNU Wget documents HTTP, HTTPS, and FTP support, not LDAP URLs, so I removed that command.
- The Base DN discovery fix used an incomplete `ldapsearch` example without the connection and bind parameters needed for typical non-anonymous directories. I replaced it with a complete command and broadened the search to include both organizational units and container objects.
- The Portainer API snippet read `ldapsettings` from `/api/settings`. Portainer’s API model exposes this field as `LDAPSettings`, so I corrected the JSON key.
- The debug logging example used `--log-level=debug`. Portainer’s log level handling expects uppercase values such as `DEBUG`, so I corrected the flag value.
- The diagnostic checklist and conclusion referenced checks that the post did not actually demonstrate (`User bind`, `Group search`, and “test the full authentication flow”). I aligned that text with the checks actually covered in the post.
- The CA certificate guidance referred generically to “Portainer LDAP settings”. I updated it to the specific Portainer field name, `TLS CA certificate`, to match the current documentation.

## Review Notes
- The `/api/auth` example is technically valid: Portainer returns a JWT in the `jwt` field, and `/api/settings` accepts bearer-token authentication.
- Portainer’s documented CLI example for troubleshooting uses `--log-level DEBUG`, and current docs also note that debug logging can be enabled through Settings.
- Utility availability inside the running `portainer` container can vary by image/build. If `nc` or `nslookup` are unavailable in a given deployment, equivalent checks from the host or from a temporary debug container on the same network are the more portable fallback.
