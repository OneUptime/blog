# Validation Summary: How to Configure K3s Private Registry

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- containerd / CRI registry configuration
- Docker Hub
- CNCF Distribution (Docker Registry)
- Docker Compose

## Sources Consulted
- K3s private registry configuration: https://docs.k3s.io/installation/private-registry
- K3s agent CLI flags: https://docs.k3s.io/cli/agent
- K3s server CLI flags: https://docs.k3s.io/cli/server
- K3s CLI tools (`k3s crictl`): https://docs.k3s.io/cli
- Docker personal access tokens: https://docs.docker.com/security/access-tokens/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub registry mirror / pull-through cache: https://docs.docker.com/docker-hub/image-library/mirror/
- CNCF Distribution configuration reference: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution pull-through cache recipe: https://distribution.github.io/distribution/recipes/mirror/
- containerd registry host configuration: https://github.com/containerd/containerd/blob/main/docs/hosts.md
- containerd CRI registry configuration: https://github.com/containerd/containerd/blob/main/docs/cri/registry.md

## Issues Found
- Mirror fallback behavior was described too strongly. The post implied explicit fallback entries like `https://docker.io` or `https://registry-1.docker.io` were needed in `mirrors.endpoint`, but K3s documents that containerd already tries the registry's default endpoint last unless `--disable-default-registry-endpoint` is set. I removed the fallback lines and corrected the explanation and comments.
- The mirror section suggested air-gapped use without the required caveat. I updated the text to note that true air-gapped behavior requires `--disable-default-registry-endpoint`.
- The `auth: "base64(username:password)"` example was mislabeled as "htpasswd-style" authentication. I renamed it to base64-encoded basic auth because htpasswd files are a different format.
- The pull-through cache Compose example used an obsolete top-level `version` field and the older `registry:2` image tag. I removed the obsolete `version` field and updated the example to `registry:3`, which matches current registry deployment guidance.
- The troubleshooting step used `journalctl -u k3s`, which is not the K3s-documented source for detailed image pull failures and ignores the agent service name. I replaced it with the containerd log path from the K3s docs and showed both server and agent restart commands.

## Review Notes
- The post is technically sound after the fixes above and aligns with current K3s documentation as of 2026-04-29.
- K3s documents `--disable-default-registry-endpoint` as available in the January 2024 K3s release line and later; the air-gap caveat depends on running a release that includes that option.
- `docker-compose.yml` remains supported, but current Docker Compose documentation treats the top-level `version` field as obsolete.
