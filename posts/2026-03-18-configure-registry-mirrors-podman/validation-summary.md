# Validation Summary: How to Configure Registry Mirrors in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers-registries.conf
- OCI/container registries
- CNCF Distribution registry pull-through cache
- TLS certificates for container registries

## Sources Consulted
- containers-registries.conf(5), registry mirror syntax, ordering, fallback, remapping, and Docker Hub normalization: https://manpages.ubuntu.com/manpages/jammy/en/man5/containers-registries.conf.5.html
- CNCF Distribution, Registry as a pull through cache: https://distribution.github.io/distribution/recipes/mirror/
- CNCF Distribution, registry proxy configuration: https://distribution.github.io/distribution/about/configuration/
- containers-certs.d(5), Podman/container registry certificate directory structure: https://manpages.ubuntu.com/manpages/stonking/man5/containers-certs.d.5.html

## Issues Found
- The post described mirror-based offline access too broadly. A pull-through cache only helps offline if the needed image content is already cached or otherwise present in the mirror. Updated the description, introduction, and summary to clarify that offline access applies to cached images.
- The "Disabling Fallback to Primary" section said fallback could be disabled by omitting the primary location or blocking it. In current `containers-registries.conf`, a mirror entry falls back to `registry.location` or the original image reference if no mirror contains the image; `blocked = true` forbids matching pulls rather than serving as a fallback-control mechanism. Updated the section to describe the shown example accurately as remapping `docker.io` references to the local registry by setting `location` directly.

## Review Notes
The TOML fields `prefix`, `location`, `insecure`, and `[[registry.mirror]]` match the documented `containers-registries.conf` format. The pull-through cache environment variable maps to the Distribution `proxy.remoteurl` setting, and the certificate directory example matches the documented `/etc/containers/certs.d/<host[:port]>/ca.crt` layout.
