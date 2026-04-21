# Validation Summary: How to Troubleshoot Container Registry IPv6 Access Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- IPv6 networking and DNS AAAA resolution
- Container registries and Docker Registry HTTP API V2
- TLS certificates and OpenSSL
- Linux firewall tooling with ip6tables
- containerd ctr
- Kubernetes kubectl and image pulls
- curl, dig, nslookup, ping, nc, and journalctl

## Sources Consulted
- Docker IPv6 networking documentation: https://docs.docker.com/engine/daemon/ipv6/
- Docker registry certificate documentation: https://docs.docker.com/engine/security/certificates/
- Docker CLI reference for docker run, docker pull, docker login, and dockerd insecure registries: https://docs.docker.com/reference/
- Docker deprecated features documentation: https://docs.docker.com/engine/deprecated/
- Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/storage/
- CNCF Distribution Registry HTTP API V2: https://distribution.github.io/distribution/spec/api/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes private registry image pull task: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- curl container image source and README: https://github.com/curl/curl-container
- containerd ctr source for global flags and image pull flags: https://github.com/containerd/containerd/tree/main/cmd/ctr
- Distribution image reference parser for bracketed IPv6 registry names: https://github.com/distribution/reference/blob/main/regexp.go
- OpenSSL s_client documentation: https://docs.openssl.org/3.6/man1/openssl-s_client/
- OpenBSD nc manual for -6, -w, and -z behavior: https://man.openbsd.org/OpenBSD-6.7/nc.1
- iputils ping manpage notes for ping -6 / ping6 behavior: https://manpages.debian.org/trixie/iputils-ping/ping6.8
- Local command help output for curl, dig, BusyBox nslookup, iproute2 ip, ip6tables, OpenSSL, OpenBSD netcat, and journalctl.

## Issues Found
- The post used `ping6`. Modern iputils merged `ping6` into `ping`; changed the examples to `ping -6` and added `-c 4` to the registry hostname ping so the command terminates.
- The direct port test used `nc -6 -w 5`, which opens a connection and can wait for idle timeout. Added `-z` so it performs an actual port scan without sending data.
- The firewall section said the default-policy commands temporarily disable the firewall. They only change default chain policies and do not remove existing rules. Updated the comment to describe the behavior accurately.
- The Docker debug pull example used `DOCKER_CLI_EXPERIMENTAL=enabled`, which Docker documents as deprecated and no longer functional. Removed the environment variable and kept the valid `docker --debug pull ...` command.
- The containerd example put `--debug` after `images pull`. containerd documents `--debug` as a global `ctr` flag, so the command was changed to `ctr --debug images pull ...`.
- The DNS error explanation treated `no such host` as only an IPv6 AAAA problem. Updated it to cover general DNS resolution failure and the no-AAAA case when IPv6 is forced, and added the TLS caveat for IPv6 literals.
- The connection-refused example used `[::]:443`, which is the unspecified IPv6 address and is not a realistic resolved registry target. Replaced it with `[2001:db8::1]:443`.
- The Kubernetes one-shot debug pod omitted `--restart=Never`; `kubectl run` defaults to `Always`. Added `--restart=Never` so the curl debug pod exits cleanly instead of being restartable.

## Review Notes
- Docker and kubectl were not installed in the local workspace, so those examples were checked against official documentation and upstream source rather than executed locally.
- `registry.example.com` and `2001:db8::1` are documentation placeholders; users must replace them with real registry names and routable IPv6 addresses.
- The intro mentions Podman, but the examples are Docker, containerd, and Kubernetes focused. A future revision could add Podman-specific command equivalents.
