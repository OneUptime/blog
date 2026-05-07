# Validation Summary: How to Fix Podman Containers Stopping at Logout

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman rootless and rootful containers
- systemd user services
- systemd-logind and loginctl lingering
- Podman-generated systemd unit files
- Podman Quadlet
- XDG_RUNTIME_DIR
- tmux and screen

## Sources Consulted
- Podman documentation: podman-generate-systemd, including deprecation notice, `--new`, `--files`, generated unit installation, and linger note: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman documentation: podman-systemd.unit / Quadlet search paths, supported keys, generated transient service behavior, and `[Install]` handling: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman documentation: podman-quadlet overview: https://docs.podman.io/en/latest/markdown/podman-quadlet.1.html
- systemd loginctl manual for `enable-linger`: https://www.freedesktop.org/software/systemd/man/latest/loginctl.html
- systemd logind.conf manual for `KillUserProcesses=` and session scope behavior: https://www.freedesktop.org/software/systemd/man/latest/logind.conf.html
- systemd pam_systemd manual for `/run/user/$UID` and `XDG_RUNTIME_DIR` lifecycle: https://www.freedesktop.org/software/systemd/man/latest/pam_systemd.html
- Local systemd man pages and CLI help for `loginctl`, `systemctl --user`, `logind.conf`, and `pam_systemd`.

## Issues Found
- The post stated that systemd always terminates all user processes on logout. This was too broad. systemd-logind only kills session-scope processes when `KillUserProcesses=yes`; otherwise session scopes may be abandoned, while the user manager and runtime directory normally end after the final logout. Updated the explanation, intro, linger check, and conclusion to reflect the documented behavior.
- The Quadlet examples used `systemctl --user enable` on generated `.service` units. Podman documentation says Quadlet-generated services are transient and should not be enabled directly; the generator applies the `[Install]` section instead. Removed the `enable` commands from the rootless Quadlet examples and clarified that `[Install]` is applied by the generator.
- The production Quadlet example included `After=network-online.target` in a rootless user unit. Podman Quadlet already adds appropriate network dependencies, and user units cannot reliably wait on the system `network-online.target`. Removed that line to avoid misleading behavior.

## Review Notes
The post correctly notes that `podman generate systemd` is deprecated in favor of Quadlet but still available. The generated-unit section remains valid for existing deployments, while the Quadlet section is the better recommendation for newer Podman versions.
