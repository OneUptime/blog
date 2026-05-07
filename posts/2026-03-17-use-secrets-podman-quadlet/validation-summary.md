# Validation Summary: How to Use Secrets with Podman Quadlet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Podman Quadlet
- systemd user services
- Container networking and volumes

## Sources Consulted
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman secret create documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman run secret option documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman secret remove documentation: https://docs.podman.io/en/latest/markdown/podman-secret-rm.1.html
- systemd loginctl lingering documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- systemd user service behavior documentation: https://www.freedesktop.org/software/systemd/man/systemd-run.html

## Issues Found
- The activation section said `systemctl --user enable my-app` enables the service "to start on boot." For user services, boot-time startup without an active login requires the user's systemd manager to be started at boot, typically via lingering. Changed the comment to "Enable to start with the user systemd manager" to avoid implying that `systemctl --user enable` alone guarantees boot startup without login.

## Review Notes
- Podman was not installed in the local environment, so CLI syntax was verified against official Podman documentation rather than local `--help` output.
- The post's `Secret=` examples match Quadlet's documented equivalence to Podman's `--secret` option, including repeated secrets, file mounts, custom `target`, `mode`, `uid`, `gid`, and `type=env`.
- The rotation example is valid because Podman documents that deleting and recreating a secret does not affect an already-created container; the service must be restarted or recreated to pick up the new secret.
