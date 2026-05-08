# Validation Summary: How to Run a Container with DNS Configuration in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Container networking
- DNS and `/etc/resolv.conf`
- Podman pods

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- Podman `podman-create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-network-create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Linux `resolv.conf(5)` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The introduction said the guide covered all DNS configuration options available in Podman. That was too broad because Podman also supports related settings such as `--dns=none`, network-scoped DNS, and DNS-disabling behavior on networks. Changed this to "common DNS configuration options."
- The post said multiple `--dns` values will always appear directly in `/etc/resolv.conf` in the supplied order. Current Podman documentation notes that on custom networks with DNS enabled, `/etc/resolv.conf` may point only at aardvark-dns, which then forwards non-container queries to the supplied DNS servers. Added a qualifier for containers without embedded network DNS.
- The DNS options section mentioned `--dns-opt` as an alias. Older Podman documentation used that spelling, but current official documentation uses `--dns-option`. Removed the alias reference to avoid recommending an outdated flag name.
- The custom-network example described custom DNS as being added "alongside network DNS." Current Podman behavior is more precise: embedded DNS resolves container names and forwards non-container lookups to configured DNS servers. Updated the comments around that example.
- The `--network none` section and summary said this disables all DNS. Podman documents `--network none` as disabling network connectivity and also disallows combining DNS options with that network mode; the resolver file may still exist. Updated the wording to say DNS queries cannot succeed because networking is disabled.

## Review Notes
Podman was not installed in the local workspace, so command execution could not be tested directly. Flags and behavior were validated against official Podman documentation. The post uses public DNS examples such as Google and Cloudflare; these are technically valid examples but may not be suitable for every private or regulated environment.
