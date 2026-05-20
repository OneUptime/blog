# Validation Summary: How to Use ArgoCD with Kind for Local Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- Kind
- Docker
- GitOps
- GitHub Actions
- Gitea

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Kind local registry documentation: https://kind.sigs.k8s.io/docs/user/local-registry/
- Kind quick start documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- Kubernetes image pull policy documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Argo CD install commands used client-side `kubectl apply`. Current Argo CD getting-started documentation uses `--server-side --force-conflicts` because some CRDs can exceed the client-side apply annotation size limit. Updated all Argo CD install snippets, including the GitHub Actions example.
- The pre-pull example used older Argo CD, Redis, and Dex images that do not match the current `stable` Argo CD install manifest. Updated the image tags to the images currently referenced by the stable manifest: `quay.io/argoproj/argocd:v3.4.2`, `public.ecr.aws/docker/library/redis:8.2.3-alpine`, and `ghcr.io/dexidp/dex:v2.45.0`.
- The registry section described a "Kind built-in registry" and used an older mirror configuration. Kind's official documentation describes configuring a local registry connected to Kind, not a built-in registry feature. Renamed the section and updated the configuration to use the documented `config_path` and `hosts.toml` approach.

## Review Notes
- The post remains a valid local-development tutorial. I could not execute the Kind, kubectl, or Argo CD CLI examples locally because those CLIs are not installed in the review environment, so validation was performed against official documentation and the current upstream install manifest.
- For production or reproducible CI usage, pinning the Argo CD install manifest to a specific release tag is preferable to using the moving `stable` branch.
