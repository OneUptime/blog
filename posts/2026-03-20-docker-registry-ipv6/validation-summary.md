# Validation Summary: How to Configure Docker Registry Access over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- CNCF Distribution registry
- IPv6
- TLS certificates
- OpenSSL
- curl

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Verify repository client with certificates - https://docs.docker.com/engine/security/certificates/
- Docker Docs: `dockerd` reference (`insecure-registries`) - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Compose file services reference (`ports`) - https://docs.docker.com/reference/compose-file/services/
- CNCF Distribution: Deploy a registry server - https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution: Test an insecure registry - https://distribution.github.io/distribution/about/insecure/
- Docker Docs: Docker Engine v28 release notes - https://docs.docker.com/engine/release-notes/28/
- Local CLI help: `curl --help all`
- Local CLI help: `openssl req -help`

## Issues Found
- The post incorrectly stated that Docker's `ipv6` daemon setting is required for IPv6 registry communication. I corrected this to explain that the setting is for Docker-managed container networking on Linux, not registry access itself.
- The `docker system info | grep "Registry"` command did not verify which IP Docker connected to, and the `daemon.json` DNS example would configure container DNS rather than force the daemon to use IPv6 for registry lookups. I replaced that guidance with a direct `curl -6` test of the registry endpoint.
- The registry examples used `registry:2`, while current CNCF Distribution deployment docs use `registry:3`. I updated both registry image references.
- The plain HTTP local registry example implied push and pull would work immediately. I added the missing note that an HTTP registry must be listed under `insecure-registries` before push and pull.
- The TLS trust example used `/etc/docker/certs.d/[ipv6]:443`, but Docker's certificate docs describe naming the directory after the registry host used by the client, adding `:port` only for non-default ports. I corrected the example to use `registry.internal`.
- The `daemon.json` snippet was not valid JSON because it contained a `//` comment, and it also included unrelated `ipv6` and `ip6tables` keys plus an invalid IPv6 literal `fd00:registry::1`. I removed the comment and unrelated keys and fixed the IPv6 literal.

## Review Notes
- Docker's documented daemon-side IPv6 network configuration applies to Linux hosts.
- Docker Engine 28 added IPv6 loopback as an insecure registry by default, so explicitly listing `[::1]:5000` may be redundant on newer engines, but it remains compatible guidance for older installations.
