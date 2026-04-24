# Validation Summary: How to Configure Session Timeout Duration in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- HTTP API
- JSON
- Session management
- Authentication

## Sources Consulted
- Portainer Authentication settings docs: https://docs.portainer.io/admin/settings/authentication
- Portainer CLI configuration docs: https://docs.portainer.io/advanced/cli
- Portainer account settings docs: https://docs.portainer.io/user/account-settings
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer API environment example docs: https://docs.portainer.io/admin/environments/add/api
- Portainer authentication logs docs: https://docs.portainer.io/admin/logs/authentication
- Portainer activity logs docs: https://docs.portainer.io/admin/logs/activity
- Portainer SIEM logging docs: https://docs.portainer.io/advanced/siem
- Portainer source for settings fields and defaults: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source for `/api/settings` updates: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source for the Authentication UI session lifetime selector: https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/AuthenticationView/SessionLifetimeSelect.tsx
- HHS HIPAA automatic logoff guidance: https://www.hhs.gov/hipaa/for-professionals/faq/2004/do-the-security-rule-requiremennts-for-access-control-apply-to-employees-that-telecommute/index.html
- HHS HIPAA audit protocol for automatic logoff: https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/audit/protocol/index.html
- NIST SP 800-63B session management guidance: https://pages.nist.gov/800-63-4/sp800-63b/session/
- NIST SP 800-53 Rev. 5: https://csrc.nist.gov/Pubs/sp/800/53/r5/upd1/Final
- PCI SSC FAQ on reauthentication after 15 minutes of idle time: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/what-is-the-purpose-of-pci-dss-requirement-8-2-8-which-requires-users-to-reauthenticate-after-15-minutes-of-idle-time/

## Issues Found
- The post described Portainer's setting as an inactivity timeout. Portainer documents it as a session lifetime or reauthentication timeout, and the server implements it as JWT expiry from login time. I corrected the description, introduction, and comparison table.
- The CLI section used nonexistent flags (`--feature-flag-user-timeout` and `--http-disabled-password`) and an invalid `docker run` example. I replaced that section with accurate guidance that there is no documented dedicated CLI flag for this setting.
- The UI section used the wrong field label and said users could enter a custom duration. The current UI exposes a `Session lifetime` selector with preset values, so I corrected the label and options.
- The Docker Compose example referenced an undefined `proxy` network and did not expose the standard Portainer ports. I replaced it with a valid Compose example aligned with Portainer's current installation guidance.
- The token-expiry section incorrectly said API access tokens have their own expiry if set. Portainer access tokens are separate API keys and are not controlled by the session lifetime setting, so I corrected that explanation.
- The monitoring section referenced an unsupported `/api/audit` example. I replaced it with the documented Business Edition Logs UI and SIEM logging guidance.
- The compliance section implied the Portainer setting directly maps to inactivity-based controls. I adjusted the wording to distinguish Portainer's session lifetime behavior from inactivity timeout requirements.

## Review Notes
- The `PUT /api/settings` example using `UserSessionTimeout` is technically valid, but it requires administrator privileges.
- Session lifetime changes apply only to new logins; existing sessions keep their original expiry.
