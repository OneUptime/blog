# Validation Summary: How to Switch from slirp4netns to Pasta in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Rootless container networking
- pasta
- passt
- slirp4netns
- containers.conf

## Sources Consulted
- Podman `podman-run(1)` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-network(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-network.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- `containers.conf(5)` documentation: https://man.archlinux.org/man/containers.conf.5.en
- Podman rootless documentation: https://www.mankier.com/7/podman-rootless
- passt/pasta official documentation: https://passt.top/passt/about/

## Issues Found
- The post used "backend" for the slirp4netns-to-pasta choice and used `podman info --format '{{ .Host.NetworkBackend }}'` as if it reported pasta versus slirp4netns. Podman documents that field as the Netavark/CNI network backend, while `default_rootless_network_cmd` controls the rootless networking tool. Updated wording and verification commands to distinguish those concepts.
- The slirp4netns executable check used `{{ .Host.Slirp4NetNs.Executable }}`. The Podman info struct uses `Slirp4NetNS`, so the Go template was corrected to `{{ .Host.Slirp4NetNS.Executable }}`.
- The `containers.conf` example appended a new `[network]` table blindly, which could create invalid TOML if the file already had a `[network]` section. Replaced it with a clear edit instruction and a TOML snippet.
- The post implied restarting any existing container would use pasta. Updated the wording to scope that to containers using the default rootless network.
- The performance table used exact throughput numbers and made broader memory/startup claims that were not supported by the consulted official documentation. Replaced those with qualitative, documented differences: higher throughput, native IPv6, no NAT by default, and source-IP-preserving port forwarding.

## Review Notes
The commands are intended for rootless Podman on Linux. I could not run local Podman CLI checks in this workspace because `podman` is not installed, so command validation was performed against official Podman and passt/pasta documentation.
