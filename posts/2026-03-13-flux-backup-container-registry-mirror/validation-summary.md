# Validation Summary: How to Set Up Flux with Backup Container Registry Mirror

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- containerd
- Harbor
- Helm
- Docker-compatible container registries
- AWS ECR
- Docker Hub

## Sources Consulted
- Harbor Helm chart documentation: https://github.com/goharbor/harbor-helm
- Harbor proxy cache documentation: https://goharbor.io/docs/2.10.0/administration/configure-proxy-cache/
- containerd registry host configuration documentation: https://github.com/containerd/containerd/blob/main/docs/hosts.md
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes kubectl secret command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The Harbor Helm values used `harborAdminPassword.existingSecret`, which is not a valid chart value. Changed it to `existingSecretAdminPassword` and `existingSecretAdminPasswordKey`, matching the Harbor Helm chart.
- The Harbor API example only created registry endpoints, not proxy cache projects. Added project creation calls that attach each project to the corresponding registry endpoint by `registry_id`.
- The prerequisites omitted command-line tools used by the examples. Added `curl`, `jq`, and Docker CLI tools to the CLI prerequisites.
- The introduction implied Flux image automation automatically falls back to a mirror. Flux scans the registry named in the `ImageRepository`; updated the wording to say it can scan the mirror directly.
- The containerd example wrote a Harbor proxy-cache path without `override_path = true`, which can produce the wrong request path for a proxy-cache project prefix. Added `override_path = true`.
- The containerd section did not mention that CRI must be configured with `config_path = "/etc/containerd/certs.d"`. Added the required containerd 1.x and 2.x configuration locations.
- The DaemonSet used the legacy `gcr.io/google-containers/pause:3.9` image. Updated it to `registry.k8s.io/pause:3.9`.
- The best-practices section referred to generic Harbor rate limiting. Reworded it to limiting cache-warming concurrency or proxy speed, which is the relevant operational control for this scenario.

## Review Notes
- The containerd node-level configuration remains environment-specific. Some managed Kubernetes services restrict direct node configuration, so the DaemonSet approach should be tested against the target provider's node image and security policy.
- Harbor proxy cache projects serve cached images when the upstream is unreachable, but they cannot serve images that were never cached or replicated.
