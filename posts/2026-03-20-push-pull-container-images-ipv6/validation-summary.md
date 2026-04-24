# Validation Summary: How to Push and Pull Container Images over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Buildx
- Docker Registry / CNCF Distribution
- IPv6
- Podman
- containerd

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: docker image tag - https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Verify repository client with certificates - https://docs.docker.com/engine/security/certificates/
- Docker Docs: docker buildx create - https://docs.docker.com/reference/cli/docker/buildx/create/
- Docker Docs: docker buildx build - https://docs.docker.com/engine/reference/commandline/build/
- Docker Docs: docker buildx imagetools inspect - https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- CNCF Distribution Docs: Deploy a registry server - https://distribution.github.io/distribution/about/deploying/
- distribution/reference package docs - https://pkg.go.dev/github.com/distribution/distribution/reference
- Podman Docs: podman pull - https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman Docs: podman push - https://docs.podman.io/en/stable/markdown/podman-push.1.html
- containers/image docs: containers-registries.conf(5) - https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.conf.5.md
- containerd Docs: CRI config guide - https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- containerd Docs: Configure image registry - https://github.com/containerd/containerd/blob/main/docs/cri/registry.md
- containerd Docs: Registry configuration / hosts.toml - https://github.com/containerd/containerd/blob/main/docs/hosts.md

## Issues Found
- The post presented Docker daemon IPv6 bridge configuration as a prerequisite for image push/pull. Docker’s official IPv6 docs scope that setting to container bridge networking, so I rewrote the section as optional and made the `daemon.json` example valid JSON.
- The pull examples overstated IPv6 selection for hostname-based registries and Docker Hub. I corrected the wording to reflect that IPv6 depends on host DNS resolution and connectivity, not a Docker-specific force-IPv6 setting.
- The `tcpdump` example used `eth0` and `%1`, which are brittle in many environments. I changed it to `-i any` and a shell-safe PID capture with `$!`.
- The local registry example used `registry:2`, while current CNCF Distribution deployment docs use `registry:3`. I updated the image tag and separated the JSON snippet from the shell block so the examples are syntactically correct.
- The Podman push example was incomplete because it did not identify a valid local source image or documented destination transport. I replaced it with a `podman push myapp:latest docker://...` example and aligned the insecure-registry config with a hostname-based registry definition from `containers-registries.conf`.
- The containerd example used deprecated `registry.mirrors` and `registry.configs` configuration and then implied that `ctr` would read CRI config automatically. I replaced it with the current `config_path` plus per-registry `hosts.toml` approach and updated the `ctr` example to use `--hosts-dir`, as documented by containerd.
- The multi-platform verification step used `docker manifest inspect`, which Docker still documents as experimental. I replaced it with `docker buildx imagetools inspect`, which is the current Buildx workflow for inspecting registry image indexes.
- The Docker certificate troubleshooting example used an IPv6-literal `certs.d` path that is not documented in Docker’s certificate guide. I switched it to the documented `hostname:port` directory layout and modernized `ping6` to `ping -6`.

## Review Notes
- Docker image references do support IPv6 literals in square brackets; that behavior is defined in the distribution/reference parser used by Docker tooling.
- On newer Docker Engine releases, `::1/128` is treated as an insecure registry by default, but keeping explicit insecure-registry configuration remains clearer for a general-purpose guide.
- containerd 2.x moves the CRI registry stanza from `[plugins."io.containerd.grpc.v1.cri".registry]` to `[plugins."io.containerd.cri.v1.images".registry]`; the post now calls that out inline.
