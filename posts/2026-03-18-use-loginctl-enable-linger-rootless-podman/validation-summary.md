# Validation Summary: How to Use loginctl enable-linger with Rootless Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- `systemd`
- `loginctl`
- `systemctl --user`
- Rootless Podman
- Podman Quadlet

## Sources Consulted
- `loginctl(1)` man page: https://www.freedesktop.org/software/systemd/man/loginctl.html
- `logind.conf(5)` man page: https://www.freedesktop.org/software/systemd/man/latest/logind.conf.html
- `user@.service(5)` man page: https://www.freedesktop.org/software/systemd/man/user@.service.html
- `bootup(7)` man page: https://www.freedesktop.org/software/systemd/man/bootup.html
- `systemd.special(7)` man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.special
- `podman-generate(1)` man page: https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- `podman-systemd.unit(5)` man page: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- `podman-container.unit(5)` man page: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- `podman-quadlet-basic-usage(7)` guide: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html

## Issues Found
- The introduction overstated linger behavior by saying systemd kills all user processes the moment the last session ends. I changed this to describe the actual per-user manager behavior documented by `systemd`, which is that the user manager and its user services are normally stopped after the last session ends unless lingering is enabled.
- The post used `user-$(id -u).slice` to verify the user manager. I changed this to `user@$(id -u).service`, which is the actual system unit that starts and owns the per-user systemd manager.
- The verification example used `ps aux | grep "systemd --user"`, which can match the `grep` process itself. I changed it to `pgrep -af "systemd --user"` to avoid false positives.
- The container-service workflow used `podman generate systemd`, which is marked deprecated in current Podman documentation. I replaced that example with the current Quadlet-based rootless workflow under `~/.config/containers/systemd/`.
- The old Podman example used `~/.config/systemd/user/` and `systemctl --user enable --now ...` for the service definition. I updated the article to the current Quadlet location, `WantedBy=default.target`, and `systemctl --user start myservice.service`, which matches current Podman guidance for rootless Quadlet units.
- The service names and troubleshooting commands were updated from `container-myservice.service` to `myservice.service` to match the revised Quadlet example.

## Review Notes
- `podman generate systemd` still exists, but current Podman documentation marks it as deprecated in favor of Quadlet.
- The local workspace did not have a `podman` binary installed, so Podman command verification was done against official upstream documentation rather than local `--help` output.
