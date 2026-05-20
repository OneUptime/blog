# Validation Summary: How to Install ArgoCD in an Air-Gapped Environment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- Docker
- Skopeo
- Containerd
- Helm chart repositories
- ChartMuseum
- Private container registries

## Sources Consulted
- Argo CD v2.13.3 install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
- Argo CD v2.13.3 HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/ha/install.yaml
- Argo CD Getting Started installation documentation: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Docker image save documentation: https://docs.docker.com/reference/cli/docker/image/save/
- Docker image load documentation: https://docs.docker.com/reference/cli/docker/image/load/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference
- Skopeo copy documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- Containerd registry hosts documentation: https://github.com/containerd/containerd/blob/main/docs/hosts.md
- ChartMuseum API documentation: https://chartmuseum.com/docs/

## Issues Found
- The post listed `ghcr.io/dexidp/dex:v2.38.0` as the Dex image for Argo CD v2.13.3, but the official v2.13.3 install manifest references `ghcr.io/dexidp/dex:v2.41.1`. Updated the image list and all pull, save, tag, and push examples to use `v2.41.1`.
- The post mentioned downloading the HA install manifest but did not account for HA-only images. The official v2.13.3 HA manifest also references `public.ecr.aws/docker/library/redis:7.0.15-alpine` and `public.ecr.aws/docker/library/haproxy:2.6.17-alpine`. Added concise notes and manifest patch commands for these images.
- The update helper script used a broad `redis:` replacement. After adding HA image handling, that could rewrite already-patched Redis image names. Narrowed the replacement to `image: redis:` and added explicit replacements for the HA Redis and HAProxy registry prefixes.

## Review Notes
The remaining Docker, kubectl, Argo CD repository, Helm repository, Skopeo, ChartMuseum, and containerd examples are consistent with the referenced documentation. In a future revision, the post could mention mirroring per-architecture images explicitly for mixed-architecture clusters.
