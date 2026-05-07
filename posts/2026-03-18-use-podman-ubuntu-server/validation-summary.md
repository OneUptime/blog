# Validation Summary: How to Use Podman on Ubuntu Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Ubuntu Server
- Linux containers
- Rootless containers
- systemd
- Quadlet
- Compose
- UFW

## Sources Consulted
- Podman installation docs: https://podman.io/docs/installation
- Podman rootless and environment reference (`podman(1)`): https://docs.podman.io/en/v4.7.2/markdown/podman.1.html
- Podman systemd / Quadlet docs: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman compose docs: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- Podman auto-update docs: https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- Podman image pull docs: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Ubuntu package search results for `podman` / `podman-compose`: https://packages.ubuntu.com/search?keywords=podman
- Ubuntu Jammy package details for `podman`: https://packages.ubuntu.com/jammy/podman
- `pam_systemd(8)` manual: https://man7.org/linux/man-pages/man8/pam_systemd.8.html
- Ubuntu `systemd.exec(5)` manpage: https://manpages.ubuntu.com/manpages/noble/man5/systemd.exec.5.html
- openSUSE Kubic repository listing for Ubuntu 24.04: https://download.opensuse.org/repositories/devel%3A/kubic%3A/libcontainers%3A/unstable/xUbuntu_24.04/

## Issues Found
- The installation section said Podman was available in the default Ubuntu repositories starting with Ubuntu 22.04. Podman’s installation docs list Ubuntu 20.10 and newer, so I corrected that version claim.
- The Ubuntu 24.04 note described the default repository as providing a "recent version" of Podman, which is vague and not a verifiable technical claim. I changed it to the concrete, verifiable point that Ubuntu 24.04 LTS and later also package `podman-compose`.
- The rootless setup section instructed readers to export `XDG_RUNTIME_DIR` from `.bashrc`. That is not the correct setup model for systemd-managed user sessions; `pam_systemd` and the user manager provide it automatically. I replaced that with verification commands for the session-managed runtime directory.
- The Compose section presented `podman-compose` as the primary Podman interface. Current Podman docs document `podman compose` as the supported wrapper around an external provider such as `podman-compose`. I updated the text and commands accordingly while keeping the packaged provider install step.
- The migration table mapped `docker-compose` to `podman-compose`, which no longer matched the corrected Compose guidance. I updated the mapping to `podman compose`.
- The auto-update section used only the system-level timer command and an unprivileged `podman auto-update --dry-run`, which is incorrect for rootful services. I split the examples into rootful and rootless variants so the systemd scope and Podman context match.

## Review Notes
- The Kubic repository instructions point to a third-party openSUSE build repository rather than the main Podman installation page. The repository URLs used in the post currently resolve for supported Ubuntu releases, so I left the commands in place.
- The registries section is technically valid, but Podman’s docs still recommend fully qualified image references for automation and production to avoid short-name ambiguity.
