# Validation Summary: How to Block a Registry in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers-registries.conf
- TOML configuration
- Linux shell commands
- Container image registries

## Sources Consulted
- Podman documentation, `podman(1)` configuration files: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman documentation, `podman-info(1)`: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman installation documentation, `registries.conf` example: https://podman.io/docs/installation
- containers/image official `containers-registries.conf(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- Red Hat documentation, Working with container registries: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/working-with-container-registries_building-running-and-managing-containers

## Issues Found
- The introduction said blocked registries prevent both pulls and pushes. The official `registries.conf` documentation describes `blocked=true` as forbidding pulls/access for matching image names, so the post now says it prevents matching image pulls and notes that registries, namespaces, or images can be blocked.
- The pattern matching section implied wildcard prefixes cover entire domains. The documented wildcard form, such as `*.example.com`, matches subdomains, so the wording now says subdomains.
- The allow-list section implied `registries.conf` blocks all public registries except the internal registry. `unqualified-search-registries` only controls short-name search order, and the examples only block known registries, so the wording and comments now reflect that.
- The system-wide enforcement section implied file permissions alone prevent rootless user overrides. Podman can use `$HOME/.config/containers/registries.conf` instead of the system-wide file for non-root users, so the post now calls out that those files must be managed or audited.
- The verification section suggested `podman info` would list blocked registry status. Official `podman info` examples expose configured registry/search information, but blocked entries are better verified through the config files and an attempted pull, so the command was corrected.
- The temporary unblock command changed every `blocked = true` entry to `blocked = false`. It now instructs editing the specific registry block instead of globally unblocking all blocked registries.

## Review Notes
The corrected examples use the current TOML `[[registry]]` format and documented fields such as `prefix`, `location`, `insecure`, and `blocked`. The post does not specify a Podman version; behavior was checked against current Podman and containers/image documentation.
