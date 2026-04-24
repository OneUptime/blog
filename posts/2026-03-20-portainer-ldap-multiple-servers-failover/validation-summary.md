# Validation Summary: How to Configure Multiple LDAP Servers for Failover in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- LDAP / LDAPS / StartTLS
- Microsoft Active Directory
- Portainer HTTP API
- `curl`
- `ldapsearch`
- `iptables`

## Sources Consulted
- Portainer official documentation — Authenticate via LDAP: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer official documentation — Authenticate via Active Directory: https://docs.portainer.io/sts/admin/settings/authentication/active-directory
- Portainer official documentation — Can I use internal authentication and external authentication at the same time?: https://docs.portainer.io/sts/faqs/installing/can-i-use-internal-authentication-and-external-authentication-at-the-same-time
- Portainer official source/API docs — `LDAPSettings` type and field names: https://pkg.go.dev/github.com/portainer/portainer/api
- Portainer official source — settings update handler (`api/http/handler/settings/settings_update.go`): https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer official source — LDAP connection/authentication implementation (`api/ldap/ldap.go`): https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer official source — authentication settings UI controller (`app/portainer/views/settings/authentication/settingsAuthenticationController.js`): https://github.com/portainer/portainer/blob/develop/app/portainer/views/settings/authentication/settingsAuthenticationController.js
- Portainer official source — feature gating for external LDAP auth (`app/react/portainer/feature-flags/feature-flags.service.ts`): https://github.com/portainer/portainer/blob/develop/app/react/portainer/feature-flags/feature-flags.service.ts
- go-ldap package documentation: https://pkg.go.dev/github.com/go-ldap/ldap/v3
- Go standard library `net` package documentation: https://pkg.go.dev/net

## Issues Found
1. The introduction incorrectly said that if LDAP goes down, no one can log in to Portainer. Portainer's own docs and auth handler allow the initial admin account to continue using internal authentication as a break-glass path. I corrected the wording to scope the outage impact to LDAP-backed users and to mention the initial admin exception.
2. The API example used an unsupported payload shape for the public Portainer API: `ldapsettings`, `Servers`, `Host`, `Port`, `UseTLS`, `SkipVerify`, and `Username`. The documented/public API schema uses `LDAPSettings`, a single `URL`, `AnonymousMode`, `TLSConfig.TLS`, `TLSConfig.TLSSkipVerify`, and `SearchSettings[].UserNameAttribute`. I replaced the example with the documented single-server payload.
3. The post implied that multi-server LDAP failover can be configured through a `Servers` array in the API. Portainer's current public API schema documents only a single `LDAPSettings.URL`, so I updated the API section and conclusion to state that multi-server fallback is documented in the web UI, while the API example should use the single-server schema.
4. The Active Directory example incorrectly suggested that pointing Portainer at the AD domain name would let DNS SRV records handle failover transparently. Portainer's LDAP implementation dials the configured host and port directly through the LDAP client library; it does not perform SRV lookups itself. I changed the advice to recommend a stable DNS name or load balancer in front of the domain controllers instead.
5. The connection-timeout section claimed Portainer has a default per-server LDAP timeout setting. I found no Portainer UI/API setting or source-level timeout configuration for LDAP dialing, so I corrected this to explain that observed delays depend on underlying network/TCP timeout behavior rather than a Portainer-specific LDAP timeout knob.
6. The post did not mention that external LDAP/AD authentication is gated as a Business Edition feature in the current Portainer UI. I added that prerequisite so the setup requirements are technically accurate.

## Review Notes
- Portainer's official documentation currently describes adding additional LDAP servers in the web UI, but the public API schema exposed in the official source/docs still documents a single `LDAPSettings.URL`. The post now reflects that mismatch by keeping the multi-server guidance in the UI section and using only the documented API shape in the API section.
- The monitoring and failover test commands are technically plausible as illustrative examples. For stricter reproducibility, using fixed IP addresses or a test load balancer is usually more deterministic than relying on hostname resolution in `iptables` rules.
