# Validation Summary: How to Troubleshoot podman-compose Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Linux networking and port binding
- SELinux volume labels
- Container image registry configuration

## Sources Consulted
- Podman compose provider documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman run documentation for port publishing, SELinux volume labels, and `--userns=keep-id`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman inspect documentation for `--format`: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman network prune documentation: https://docs.podman.io/en/v4.3/markdown/podman-network-prune.1.html
- podman-compose upstream README and implementation: https://github.com/containers/podman-compose
- Compose Specification, including obsolete `version` field behavior: https://compose-spec.github.io/compose-spec/spec.html
- containers registries.conf manual: https://man.archlinux.org/man/containers-registries.conf.5.en
- Red Hat documentation for Podman network inspection examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/building_running_and_managing_containers/inspecting-a-network-settings-of-a-container

## Issues Found
- The volume permission example used the old `x-podman: podman_args` form to pass `--userns=keep-id`. Current podman-compose rejects the `x-podman` dictionary form and supports user namespace configuration through `userns_mode`. Changed the snippet to `userns_mode: keep-id`.
- The Compose file version warning text said podman-compose supports version 2 and 3 syntax and suggested using a supported version. The current Compose Specification treats the top-level `version` field as obsolete and informative. Changed the guidance to remove the version field and let podman-compose use the current schema.

## Review Notes
- The `registries.conf` example is technically valid TOML for configuring unqualified search registries, but users should prefer fully qualified image names where practical because unqualified search registries can affect image-source trust.
- `sudo sysctl net.ipv4.ip_unprivileged_port_start=80` changes the setting until reboot unless persisted in sysctl configuration.
- The `podman-compose --dry-run` command is provider/version dependent. Docker Compose supports `--dry-run`; podman-compose support should be checked with `podman-compose --help` on the installed version.
