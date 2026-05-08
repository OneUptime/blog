# Validation Summary: How to Disable DNS in a Podman Network

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman networking
- aardvark-dns
- Container DNS configuration
- Docker bridge networking

## Sources Consulted
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman network inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--add-host` option documentation: https://docs.podman.io/en/v4.3/markdown/options/add-host.html
- Podman `--ip` option documentation: https://docs.podman.io/en/v4.3/markdown/options/ip.html
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/

## Issues Found
- The introduction said custom Podman networks use aardvark-dns by default. Podman documents `--disable-dns` as supported for the bridge driver and always disabled for other drivers, so this was narrowed to "bridge-based custom Podman networks."
- The Docker comparison said DNS is not available on Docker's default bridge. Docker's default bridge still uses DNS for external names but does not provide automatic container-name DNS resolution, so the wording was corrected.
- The `/etc/hosts` example created a `client` container on `no-dns-network` while mapping names to `10.80.0.x` addresses from the earlier `static-network` example. The client was changed to use `static-network` so those static addresses are reachable.

## Review Notes
The Podman CLI flags and inspect template field used in the post are current in the official documentation. The external DNS example is valid with `podman run --dns`; Podman may either write the resolver directly to `/etc/resolv.conf` or forward through aardvark-dns depending on network DNS settings.
