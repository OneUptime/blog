# Validation Summary: How to Configure Dual-Stack Networking in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman bridge networking
- IPv4
- IPv6
- Dual-stack container networking
- Container DNS and port publishing

## Sources Consulted
- Podman official documentation: `podman network create` - https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman official documentation: `podman network inspect` - https://docs.podman.io/en/latest/markdown/podman-network-inspect.1.html
- Podman official documentation: `podman run --publish` - https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman official documentation: `--ip` option - https://docs.podman.io/en/v4.3/markdown/options/ip.html
- Podman official documentation: `--ip6` option - https://docs.podman.io/en/v4.6.0/markdown/options/ip6.html
- Podman official documentation: network backend notes - https://docs.podman.io/en/stable/markdown/podman-network.1.html
- GitHub author profile - https://github.com/nawazdhandala

## Issues Found
- The original inside-container verification used `podman exec web-dual ip addr show eth0` against `docker.io/library/nginx:latest`. The official nginx image should not be assumed to include the `ip` utility. Changed the example to run an Alpine container on the same dual-stack network for the `ip addr show eth0` check.
- The port publishing curl examples mixed container IP addresses with host-published ports. `-p 8080:80` publishes container port 80 on host port 8080, so the validation commands should target the host listener. Changed the examples to `http://127.0.0.1:8080` and `http://[::1]:8080`.
- The route verification commands also assumed the nginx container has the `ip` utility. Changed them to run against `svc-a`, which is created from Alpine in the connectivity test section.

## Review Notes
The Podman `network create` examples use current documented flags: `--ipv6`, repeated `--subnet`, and repeated `--gateway`. The static address examples use documented `--ip` and `--ip6` options, with addresses inside the configured network pools. Port publishing syntax is current for bridge networks; `macvlan` and `ipvlan` networks are documented exceptions where port forwarding has no effect, but this post uses Podman's default bridge network behavior.
