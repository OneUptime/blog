# Validation Summary: How to Handle Docker-Specific Features Not in Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Docker
- Docker Swarm
- Docker Compose
- Kubernetes
- systemd and Quadlet
- BuildKit-style container builds
- Container networking
- Container volumes
- Sigstore/cosign
- Skopeo
- Container logging
- Podman secrets

## Sources Consulted
- Podman `podman kube` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-kube.1.html
- Podman `podman kube generate` documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-systemd.unit.5.html
- Podman restart policy documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman Compose wrapper documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman volume create documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman run logging documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman secret create documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Docker Swarm services documentation: https://docs.docker.com/engine/swarm/services/
- Docker Swarm stack deployment documentation: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Swarm networking documentation: https://docs.docker.com/engine/swarm/networking/
- Docker Compose profiles documentation: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose Watch documentation: https://docs.docker.com/compose/how-tos/file-watch/
- Docker Content Trust documentation: https://docs.docker.com/engine/security/trust/
- Skopeo copy documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md

## Issues Found
- The post used `podman generate kube`; updated it to the current documented `podman kube generate` form.
- The post recommended `podman generate systemd`, but Podman now documents that command as deprecated and recommends Quadlet for running containers or pods under systemd. Replaced the systemd generation examples with Quadlet `.pod` and `.container` unit examples.
- The restart policy section said `--restart=always` requires the Podman service. This is inaccurate; Podman supports container restart policies, while systemd/Quadlet is recommended for long-running services. Updated the wording and commands.
- The Compose section recommended calling `podman-compose` directly as the best compatibility path. Updated it to use Podman's documented `podman compose` wrapper with an installed Compose provider.
- The Docker plugin section said Podman has no plugin system at all. Podman does not use Docker's plugin system, but it can use configured volume plugins through `containers.conf`. Updated the claim to be more precise.
- The NFS volume example used `addr=...` with a hostless device path. Updated it to use `device=nfs-server.example.com:/exports/data`.
- The tmpfs volume example omitted `--opt device=tmpfs`, which Podman's official examples include for tmpfs volumes. Added the missing option.
- The summary referred to systemd service generation and implied volume plugins are simply replaced. Updated it to mention Quadlet/systemd and Podman-configured volume plugins.

## Review Notes
Docker Content Trust is still documented by Docker, but Docker's documentation notes that DCT for Docker Official Images is being retired and recommends planning a transition to alternatives such as Sigstore or Notation. The post's recommendation to use cosign remains appropriate.
