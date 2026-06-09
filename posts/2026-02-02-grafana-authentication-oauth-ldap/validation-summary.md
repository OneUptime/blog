# Validation Summary: How to Configure Grafana Authentication (OAuth, LDAP)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Grafana 10.4.0
- OAuth 2.0 (Google, GitHub, Azure AD)
- LDAP / LDAPS / Active Directory
- Docker Compose
- Kubernetes / Helm
- Prometheus alerting rules
- TOML / INI configuration

## Sources Consulted
- Grafana GitHub OAuth docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/github/
- Grafana Google OAuth docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/google/
- Grafana Azure AD OAuth docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/azuread/
- Grafana LDAP docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/ldap/
- Grafana Configuration reference: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana CLI docs: https://grafana.com/docs/grafana/latest/cli/
- Grafana Admin LDAP HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/admin_ldap/
- Grafana metrics source: https://github.com/grafana/grafana/blob/main/pkg/infra/metrics/metrics.go
- Grafana monitoring setup: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-grafana-monitoring/

## Issues Found

1. **GitHub OAuth `team_ids` format was incorrect.** The post used `team_ids = your-org/devops-team your-org/platform-team`. Per official docs, `team_ids` must be a comma-separated list of *numeric* team IDs (e.g., `team_ids = 150,300`). Fixed the example to use numeric IDs with a clarifying comment.

2. **Non-existent `grafana-cli admin ldap` subcommands.** The post referenced `grafana-cli admin ldap test <user>` and `grafana-cli admin ldap reload`. These CLI subcommands do not exist - `grafana-cli admin` only supports `reset-admin-password` and `data-migration encrypt-datasource-passwords`. Replaced with the correct HTTP API endpoints: `GET /api/admin/ldap/status`, `GET /api/admin/ldap/:username`, and `POST /api/admin/ldap/reload`.

3. **Deprecated `[session]` config section.** The post documented a `[session]` section with `session_life_time = 86400`. This section was removed in Grafana 6.2 when sessions moved to the database. The options `login_maximum_inactive_lifetime_duration` and `login_maximum_lifetime_duration` actually live under the `[auth]` section. Moved them there and removed the non-existent `session_life_time` option.

4. **Non-existent `[viewers]` and `[editors]` config sections.** The post defined `[viewers]` and `[editors]` as separate sections. These sections do not exist - both `viewers_can_edit` and `editors_can_admin` live under the `[users]` section. Merged into the existing `[users]` block.

5. **Incorrect Prometheus metric names.** The post used `grafana_api_login_failures_total` and `grafana_ldap_request_duration_seconds_count`, neither of which exists. Replaced with metrics that Grafana actually exposes: `grafana_api_login_post_total` (counter of login attempts) and `grafana_ldap_users_sync_execution_time` (summary of LDAP sync job duration). Added a note that Grafana has no dedicated failed-login counter and detailed failure tracking requires log-based alerting (e.g., Loki against `logger=auth`).

## Review Notes

- The `[auth] oauth_auto_login` option still works in Grafana 10.4 but is deprecated in favor of per-provider `auto_login` settings. Left as-is since it remains functional.
- The Google OAuth `auth_url`/`token_url` use the older endpoints (`accounts.google.com/o/oauth2/auth`, `accounts.google.com/o/oauth2/token`). These still function but newer recommendations use `accounts.google.com/o/oauth2/v2/auth` and `oauth2.googleapis.com/token`. Left as-is since Grafana's documented defaults match.
- LDAP `start_tls`, `use_ssl`, `ssl_skip_verify`, `bind_dn`, `search_base_dns`, `search_filter`, `[servers.attributes]`, and `[[servers.group_mappings]]` were verified correct against the official LDAP docs.
- The Azure AD JMESPath `role_attribute_path` chain is syntactically correct.
- The GitHub `role_attribute_path` using `groups[*]` with `@org/team-slug` format is correct - GitHub team groups are surfaced to Grafana in that format via the OAuth claim, separately from the numeric `team_ids` filter.
- Helm chart key names (`grafana.ini`, `extraConfigmapMounts`, `extraSecretMounts`, `envFromSecret`) match the official `grafana/grafana` chart.
- Image tag `grafana/grafana:10.4.0` is a real released version.
