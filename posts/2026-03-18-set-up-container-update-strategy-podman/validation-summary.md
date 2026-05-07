# Validation Summary: How to Set Up a Container Update Strategy with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman auto-update
- Quadlet / podman-systemd.unit
- systemd user services and timers
- Container health checks
- skopeo
- Bash scripting

## Sources Consulted
- Podman auto-update documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman Quadlet / podman-systemd.unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman generate systemd documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman healthcheck run documentation: https://docs.podman.io/en/stable/markdown/podman-healthcheck-run.1.html
- Podman run health check options: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html

## Issues Found
- `podman generate systemd` was presented as a normal current option. Updated the text to state that Quadlet is recommended and `podman generate systemd` is deprecated, while still available.
- The `registry` auto-update policy examples did not consistently use fully qualified image references. Updated the explanation and changed `my-api:stable` examples to `registry.example.com/myteam/my-api:stable`.
- The timer customization example reloaded systemd but did not restart the active timer. Added `systemctl --user restart podman-auto-update.timer`.
- The health check examples implied that health checks alone detect failed updates for rollback. Added `--health-on-failure=kill` / `HealthOnFailure=kill` and clarified that Podman rollback detection works best with systemd readiness notification.
- The rollback script recreated a container from an image ID, which loses the systemd-managed configuration and is not valid for `registry` auto-update. Replaced it with a Quadlet-based rollback that pins a known-good image and restarts the generated service.
- The staged update script stopped and removed containers without recreating their full configuration. Updated it to pull the current image reference and restart the corresponding systemd service.
- The version-locking snippet was marked as Bash while containing Quadlet configuration, and the comment incorrectly suggested inspecting labels removes auto-update behavior. Split the snippets and corrected the comment.
- The test-update script used `podman healthcheck run` without defining a health check on the test container. Added a health check command and retry settings to the test container.

## Review Notes
The post is technically relevant and now validated against current official Podman documentation. The examples assume rootless user services (`systemctl --user`) and service names that match container names, which is reasonable for the tutorial but should be adapted for rootful deployments or custom Quadlet service names.
