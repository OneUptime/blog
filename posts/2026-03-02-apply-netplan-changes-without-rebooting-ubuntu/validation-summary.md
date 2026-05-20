# Validation Summary: How to Apply Netplan Changes Without Rebooting on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- Netplan
- systemd-networkd
- NetworkManager
- cloud-init
- Linux networking commands (`ip`, `ping`, `resolvectl`, `networkctl`, `journalctl`)

## Sources Consulted
- Netplan `netplan try` manpage: https://manpages.ubuntu.com/manpages/questing/man8/netplan-try.8.html
- Netplan `netplan apply` manpage: https://netplan.readthedocs.io/en/latest/netplan-apply/
- Netplan `netplan generate` documentation: https://canonical-netplan.readthedocs-hosted.com/en/latest/netplan-generate/
- Netplan CLI overview: https://manpages.ubuntu.com/manpages/stonking/man8/netplan.8.html
- Netplan introduction and generated configuration behavior: https://canonical-netplan.readthedocs-hosted.com/en/latest/structure-id/
- Netplan security guidance for YAML file permissions: https://canonical-netplan.readthedocs-hosted.com/en/latest/security/
- systemd `networkctl` documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- cloud-init network configuration documentation: https://docs.cloud-init.io/en/latest/reference/network-config.html
- NetworkManager keyfile locations: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- Ubuntu Core NetworkManager and Netplan documentation: https://documentation.ubuntu.com/core/explanation/system-snaps/network-manager/how-to-guides/networkmanager-and-netplan/

## Issues Found
- The post described Netplan as having exactly three commands. Netplan has additional runtime CLI commands such as `get`, `set`, and `status`, so the wording was changed to "three commonly used commands."
- The `netplan apply` explanation said Netplan reads only `/etc/netplan/`. Official Netplan documentation says it reads YAML from `/{lib,etc,run}/netplan/`, with shadowing and lexicographic merge rules, so this was corrected.
- The generated NetworkManager configuration path was listed as `/etc/NetworkManager/system-connections/`. Netplan-generated NetworkManager profiles are ephemeral and generated under `/run/NetworkManager/system-connections/`, so the path was corrected.
- The `netplan apply` behavior was described as bringing changed interfaces down and back up. Official documentation is more specific: Netplan generates backend configuration, invokes systemd-networkd or NetworkManager, and may rebind interfaces that are still down. The wording was softened to avoid guaranteeing a down/up cycle for every changed interface.
- The post used `networkctl reconfigure` as if it were enough after generated configuration changes. systemd documents that `networkctl reconfigure` does not reload `.network` or `.netdev` files, so `networkctl reload` was added before `networkctl reconfigure`.
- The post said Netplan YAML file permissions "must be 600 or 644." Netplan security documentation recommends root ownership and `chmod 600`, with files not readable by non-privileged users, so the wording and fix command were aligned with that recommendation.
- The `netplan try` rollback section did not mention documented rollback caveats. A short note was added advising verification after timeout or cancellation.
- The systemd-networkd reload example used `systemctl reload systemd-networkd`. The documented `networkctl reload` command is the clearer systemd-networkd interface for reloading `.network` and `.netdev` files, so the command was changed.

## Review Notes
The post is technically relevant and current after the corrections. Future improvements could mention that file names vary across Ubuntu images, so `/etc/netplan/01-config.yaml` is an example path rather than a guaranteed default on every host.
