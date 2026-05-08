# Validation Summary: How to Create a Quadlet Container Unit File

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Container unit files
- Podman container networking, volumes, health checks, and resource limits

## Sources Consulted
- Podman `podman-systemd.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-container.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman `podman-run(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
- The introduction said the user-service example provides automatic startup on boot. For user Quadlets enabled with `systemctl --user enable`, startup is tied to the user manager unless lingering or a system unit is used. Changed the wording to "automatic container startup with systemd."
- The PostgreSQL example used `Volume=pgdata.volume:/var/lib/postgresql/data` without also providing a matching `pgdata.volume` Quadlet file. Podman documents `.volume` references as a special Quadlet dependency that requires the corresponding `.volume` file to exist, so the example was changed to the ordinary named volume `pgdata:/var/lib/postgresql/data`.
- The network example used `Network=app-network.network` without also providing a matching `app-network.network` Quadlet file. Podman documents `.network` references as a special Quadlet dependency that requires the corresponding `.network` file to exist, so the example was changed to `Network=bridge`.
- The dry-run command used `/usr/lib/podman/quadlet --dryrun --user`, but current Podman documentation uses `/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun`. Updated the command.

## Review Notes
The remaining `[Container]` keys and systemd commands are consistent with current Podman Quadlet documentation. The examples use user units under `~/.config/containers/systemd/`; starting those units automatically before login requires additional systemd user lingering configuration, which is outside the scope of this post.
