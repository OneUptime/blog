# Validation Summary: How to Use the health-on-failure Option in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Podman CLI restart and health-check options
- systemd-managed containers

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-container.unit` official documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman `podman-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman upstream API/type documentation for inspect health-check configuration: https://pkg.go.dev/github.com/containers/podman/v6/libpod/define

## Issues Found
- The post described `--health-on-failure` as acting whenever a health check fails. Podman documents the action as occurring once the container transitions to an unhealthy state, so the introductory wording was updated to match that behavior.
- The post recommended combining `--health-on-failure restart` with the `--restart` flag. Podman documentation explicitly says not to combine the `restart` health-on-failure action with `--restart`, so the section was changed to advise using systemd restart policy with `kill` or `stop` for the health failure action.
- The inspect example used `{{.Config.Healthcheck}}`, which does not directly show the health-on-failure action. It was changed to `{{.Config.HealthcheckOnFailureAction}}`.

## Review Notes
The `none`, `kill`, `restart`, and `stop` actions are current valid values for `--health-on-failure`. The health-check commands assume the container image includes `curl`; that is reasonable for illustrative examples but should be checked when adapting the commands to minimal images.
