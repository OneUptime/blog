# Validation Summary: How to Use Volume Plugins with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Docker volume plugin API
- containers.conf
- Unix sockets
- Container volumes

## Sources Consulted
- Podman `podman-volume-create` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman `podman-volume-reload` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-reload.1.html
- Podman `podman-volume-ls` documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman volume mount option documentation: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- containers/common `containers.conf(5)` documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- Docker volume plugin protocol documentation: https://docs.docker.com/engine/extend/plugins_volume/
- MatchbookLab local-persist repository: https://github.com/MatchbookLab/local-persist

## Issues Found
- The post implied that placing or listing sockets under `/run/docker/plugins` or `/run/containers/plugins` was enough for Podman to discover volume plugins. Current Podman documentation says plugins used with `podman volume create --driver` must be defined in the `volume_plugins` section of `containers.conf`. I added an `/etc/containers/containers.conf.d/local-persist.conf` drop-in example using `[engine.volume_plugins]` and the plugin socket path.
- The post used `podman info --format '{{ .Plugins.Volume }}'` to check registered volume plugins. I did not find this as the documented Podman check for volume plugins, and Podman provides `podman volume reload` for configured volume plugins. I replaced the check with `podman volume reload`.
- The local-persist example did not mention that the upstream project is deprecated. I updated the example label to make that caveat clear while keeping the author's original example.
- The containerized plugin example showed creating a volume immediately after starting the plugin container without registering the plugin socket with Podman. I added a note to register the socket in `containers.conf` before using the driver.

## Review Notes
- The Podman CLI was not installed in the local review environment, so CLI behavior was verified against current official Podman documentation rather than local `--help` output.
- The `local-persist` release download URL still resolves to the current release asset, but the upstream repository states that the project is deprecated and not maintained.
