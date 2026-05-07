# Validation Summary: How to Validate Quadlet Files with podman quadlet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman Quadlet
- podman-system-generator
- systemd generators
- systemd-analyze
- Bash

## Sources Consulted
- Podman `podman-systemd.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-container.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- systemd `systemd-analyze(1)` documentation: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html

## Issues Found
- The invalid-directive example used `PublishPorts=8080:80`, but the documented Quadlet container key is `PublishPort=`. Changed it to `PublishPort=8080:80` so the example isolates the intended `Imagee=` typo.
- The `systemd-analyze` example omitted Podman's documented `--generators=true` option for checking generated Quadlet units. Changed the verification command to `systemd-analyze --user --generators=true verify webapp.service`.
- The validation script accepted `QUADLET_DIR` but did not pass it to the generator. Changed the generator invocation to set `QUADLET_UNIT_DIRS="$QUADLET_DIR"` so the script validates the requested directory.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was checked against the current official Podman documentation rather than local `--help` output.
