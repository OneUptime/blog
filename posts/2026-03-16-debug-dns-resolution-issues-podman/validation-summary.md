# Validation Summary: How to Debug DNS Resolution Issues in Podman Containers

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Podman
- Podman networking
- Netavark
- Aardvark DNS
- CNI dnsname plugin
- DNS resolver configuration
- Rootless container networking with slirp4netns and pasta
- Podman Compose / Compose DNS configuration

## Sources Consulted
- Podman `podman-run` reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-network-create` reference: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-network-inspect` reference: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman network alias option reference: https://docs.podman.io/en/v4.3/markdown/options/network-alias.html
- Compose Specification services reference: https://compose-spec.github.io/compose-spec/05-services.html
- Podman blog, "Testing Podman 4 with the new network stack": https://podman.io/blogs/2022/02/04/network-usage
- containers/dnsname README: https://github.com/containers/dnsname
- containers/aardvark-dns README: https://github.com/containers/aardvark-dns

## Issues Found
- The post said Podman uses either Aardvark DNS or dnsmasq depending on version. This was imprecise for current Podman: Netavark uses Aardvark DNS, while older CNI-based setups may use the `dnsname` plugin, which runs dnsmasq. Updated the wording to distinguish the network backend and DNS helper correctly.
- The post described `podman info --format '{{.Plugins.Network}}'` as a way to check the DNS plugin. Official Podman documentation describes this as a list of supported network drivers/plugins, not the active DNS implementation. Replaced it with `podman info --format '{{.Host.NetworkBackend}}'` and added `podman network inspect -f '{{.DNSEnabled}}' my-network` to check whether DNS is enabled for a network.

## Review Notes
The other Podman DNS flags and examples, including `--dns`, `--dns-search`, `--dns-option`, custom networks for DNS-based name resolution, and rootless `slirp4netns` / `pasta` network modes, match the current Podman documentation. The local review environment did not have `podman` installed, so command behavior was verified against official documentation rather than local CLI output.
