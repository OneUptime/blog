# Validation Summary: How to Access Host Loopback from a Rootless Podman Container

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Podman
- Rootless containers
- Podman networking
- pasta
- slirp4netns
- containers.conf
- Linux loopback networking

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman-network` official documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-network.1.html
- Containers `containers.conf` official documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- slirp4netns official project documentation: https://github.com/rootless-containers/slirp4netns

## Issues Found
- The post stated that pasta allows host loopback access by default. Current Podman documentation says Podman assumes `--no-map-gw` by default for pasta, so direct host gateway access is disabled unless `--map-gw` is passed. Updated the pasta section and summary to require `--map-gw` for gateway access or `-T,<port>` for specific host-loopback port forwarding.
- The `host.containers.internal` examples implied the hostname alone enables host loopback access. Official Podman documentation describes it as a host gateway mapping, while actual reachability still depends on the selected network backend and options. Updated the examples to include `--network pasta:--map-gw`.
- The `--add-host host:host-gateway` examples also relied on hostname mapping alone. Updated those examples to include `--network pasta:--map-gw` so the mapped gateway is reachable with pasta.
- The `containers.conf` snippet put `default_rootless_network_cmd` under `[containers]`. Current Podman documentation places `default_rootless_network_cmd` and `pasta_options` under `[network]`; `network_cmd_options` for slirp4netns remains under `[engine]`. Updated the configuration snippet accordingly.

## Review Notes
Podman was not installed in the local review environment, so command behavior was validated against official Podman and containers documentation rather than local `podman --help` output.
