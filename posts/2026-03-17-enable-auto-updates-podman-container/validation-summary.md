# Validation Summary: How to Enable Auto-Updates for a Podman Container

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Podman
- Podman auto-update
- Quadlet
- systemd user units and timers
- Container image tags and digests

## Sources Consulted
- Podman `podman-auto-update(1)` documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- Podman `podman-systemd.unit(5)` documentation for Quadlet `AutoUpdate=`: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-generate-systemd(1)` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html

## Issues Found
- The prerequisites stated that the `io.containers.autoupdate` label is required. This is incomplete for Quadlet because the official documentation allows either the label or the `AutoUpdate` field in a Quadlet file. Updated the prerequisite to mention both valid mechanisms.
- The `podman run` section implied that adding the auto-update label to a manually run container was sufficient. Podman auto-update requires the container to run inside a systemd unit, and generated units should create new containers on restart for updated images. Updated the wording to clarify that the labeled container still needs an appropriate systemd unit, such as one generated with `podman generate systemd --new`.
- The notes described `latest` and `stable` as "specific tags." These are mutable tags, which is the relevant technical point for registry-based auto-update. Updated the wording accordingly.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output. The current Podman documentation marks `podman generate systemd` as deprecated and recommends Quadlet for systemd-managed containers, but the command remains documented and usable for legacy/generated-unit workflows.
