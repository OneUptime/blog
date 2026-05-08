# Validation Summary: How to Create a Quadlet Image Unit File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user units
- Container image pulls
- Podman auto-update

## Sources Consulted
- Podman `podman-image.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-image.unit.5.html
- Podman `podman-systemd.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-auto-update(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html

## Issues Found
- The post said `.image` unit files provide optional auto-update support by themselves. Podman auto-update is configured on container or kube units with `AutoUpdate=` or the `io.containers.autoupdate` label, so I changed the wording and example to show `AutoUpdate=registry` in a `.container` unit referencing the `.image` file.
- The description said `.image` units manage image pulling and tagging. The documented `.image` unit behavior is pulling and caching images, so I removed the tagging claim.
- The private registry command implied starting the `.image` unit directly as `myapp`. I clarified that the command starts a service that references the private image.
- The TLS example used `PodmanArgs=--tls-verify=false`. That is valid as a general escape hatch, but Podman documents the dedicated `.image` key `TLSVerify=false`, so I updated the example to use the documented key.
- The managing images section said `podman images` checks which images are managed by Quadlet. `podman images` lists local images and does not distinguish Quadlet-managed images, so I corrected the comment.

## Review Notes
The examples use current Quadlet `.image` syntax and the documented `.container` `Image=name.image` reference behavior. Auto-update requires a fully qualified image reference for the `registry` policy, which the examples use.
