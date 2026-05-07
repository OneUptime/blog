# Validation Summary: How to Set Up a Private Registry with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- CNCF Distribution registry
- Container registry TLS
- htpasswd authentication
- systemd user services
- Podman Quadlet

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman login` documentation: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- containers-certs.d manual: https://www.mankier.com/5/containers-certs.d
- CNCF Distribution registry configuration documentation: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution garbage collection documentation: https://distribution.github.io/distribution/about/garbage-collection/

## Issues Found
- The post used `/opt/registry/...` paths while showing rootless-style Podman and user systemd commands. A normal user usually cannot create or redirect files under `/opt`, so the examples would fail without root. I changed the host-side registry files to `$HOME/registry/...`.
- The Podman certificate installation used `/etc/containers/certs.d/...`, which requires root and does not match the user-level flow in the rest of the post. I changed it to `$HOME/.config/containers/certs.d/registry.example.com:5000/ca.crt`, which is supported by containers-certs.d for per-user registry TLS configuration.
- The garbage collection example ran `registry garbage-collect` inside the live registry container. CNCF Distribution warns that garbage collection should run only while the registry is read-only or not running, otherwise uploads can be corrupted. I changed the example to stop the registry, run a one-shot registry container against the same mounted storage and config, then start the registry again.
- The systemd section used `podman generate systemd`, which current Podman documentation marks deprecated and recommends replacing with Quadlet. I replaced the generated-service example with a `.container` Quadlet unit under `~/.config/containers/systemd`, followed by `systemctl --user daemon-reload` and `systemctl --user enable --now`.
- The systemd section claimed boot startup but did not enable user lingering. I added `sudo loginctl enable-linger "$USER"` so the user service can start at boot without waiting for an interactive login.
- The Quadlet service startup could conflict with the already-running `private-registry` container from earlier steps. I added `podman stop` and `podman rm` before enabling the Quadlet-managed service.

## Review Notes
The registry commands assume `registry.example.com` resolves to the host running the registry and that the certificate SAN values are adjusted for the real DNS name or IP address. That assumption is typical for examples but should be called out if the post is expanded later.
