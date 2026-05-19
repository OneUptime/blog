# Validation Summary: How to Install and Configure Teleport on Ubuntu for SSH Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 LTS
- Teleport
- SSH access management
- Teleport Auth Service, Proxy Service, and SSH Service
- Teleport CLI tools: `teleport`, `tctl`, and `tsh`
- UFW firewall
- Let's Encrypt / ACME TLS certificates
- Teleport RBAC roles
- Teleport session recording and audit logs

## Sources Consulted
- Teleport Linux installation documentation: https://goteleport.com/docs/installation/linux/
- Teleport Community Edition deployment guide: https://goteleport.com/docs/get-started/deploy-community/
- Teleport configuration reference: https://goteleport.com/docs/reference/deployment/config/
- Teleport `teleport` CLI reference: https://goteleport.com/docs/reference/cli/teleport/
- Teleport `tctl` CLI reference: https://goteleport.com/docs/reference/cli/tctl/
- Teleport `tsh` CLI reference: https://goteleport.com/docs/reference/cli/tsh/
- Teleport server access getting started guide: https://goteleport.com/docs/enroll-resources/server-access/getting-started/
- Teleport role reference: https://goteleport.com/docs/reference/access-controls/roles/
- Teleport audit getting started guide: https://goteleport.com/docs/get-started/audit/
- Teleport predicate language reference: https://goteleport.com/docs/reference/access-controls/predicate-language/

## Issues Found
- The apt repository setup used `apt-key`, which is deprecated on modern Ubuntu. Updated the commands to install the Teleport repository key under `/etc/apt/keyrings` and use the `signed-by` source option.
- The alternative install command depended on `https://api.releases.teleport.dev/v1/tags/teleport`, which did not resolve during validation and is not the current install command shown in Teleport's documentation. Replaced it with the official CDN install script invocation using a current explicit version.
- The configuration examples omitted an explicit Teleport config version. Added `version: v3` to match current Teleport defaults and documentation.
- The node agent configuration used `auth_servers` and direct Auth Service port `3025`. Current v3 configurations should use `proxy_server` for proxy-based joining, so the node configuration and connectivity troubleshooting were updated to use `teleport-proxy.example.com:443`.
- The firewall example exposed the Auth Service port `3025`, which is not required for the proxy-based node join flow and should not be publicly exposed in the corrected setup. Removed that UFW rule.
- The `tsh ssh --query ... ubuntu@` example was not valid for current `tsh ssh`; `--query` is documented for resource listing/search commands, not `tsh ssh`. Replaced it with a label-based SSH example.
- The RBAC role used `version: v6`; updated it to `version: v7`, matching current role examples.
- The RBAC comment claimed `[list, read]` allowed viewing but not playback of sessions. Teleport's role reference says `read` is required for playback, so the example was changed to `[list]`.
- The audit log example used `sudo tctl audit log show --last=1h`, which is not present in the current `tctl` reference. Replaced it with a Web UI audit-log note.
- The session export example said text or asciinema but used `--format=pty`. Current `tsh play` supports `text`, `json`, `yaml`, and `pty`; changed the example to export text with `--format=text`.
- The TLS troubleshooting section used a `teleport renew-cert` command that is not present in the current `teleport` CLI reference. Replaced it with checking Teleport service logs for ACME renewal errors.

## Review Notes
The guide is technically relevant and salvageable. It now aligns with current Teleport 18.x documentation for installation, v3 configuration, node joining through the proxy, RBAC session permissions, and session recording commands. Future improvements could explain when legacy listeners such as `3023` and `3024` are needed versus Teleport's default single-port TLS routing, but that was outside the scope of correcting technical errors.
