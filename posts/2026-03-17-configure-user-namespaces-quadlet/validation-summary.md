# Validation Summary: How to Configure User Namespaces in Quadlet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Linux user namespaces
- Container UID/GID mappings

## Sources Consulted
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `--userns` option documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- The Quadlet example used `User=1000:1000`. Current Quadlet documentation defines `User=` as the numeric UID and `Group=` as the numeric GID; when both are set, Quadlet combines them into the Podman `--user USER:GROUP` argument. Changed the example to `User=1000` and `Group=1000`.
- The verification commands used `secure-app` as the Podman container name. Quadlet creates `secure-app.service` from `secure-app.container`, but the default Podman container name is `systemd-secure-app` unless `ContainerName=` is set. Updated the `podman inspect` and `podman exec` commands to use `systemd-secure-app`.

## Review Notes
The `UserNS=auto`, `UserNS=auto:size=65536`, `UserNS=keep-id`, and `UserNS=keep-id:uid=1000,gid=1000` examples match current Podman user namespace syntax. `UserNS=auto` depends on available subordinate UID/GID ranges and can conflict with existing `keep-id` or `nomap` containers that consume those ranges; this is a useful operational caveat but not a correctness issue in the examples.
