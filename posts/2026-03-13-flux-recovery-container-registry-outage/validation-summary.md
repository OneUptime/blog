# Validation Summary: How to Handle Flux Recovery After Container Registry Outage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Kubernetes Deployments, CronJobs, image pull policies, and image pull secrets
- containerd registry mirror configuration
- Harbor proxy cache / pull-through cache
- Amazon ECR authentication

## Sources Consulted
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image reflector API reference: https://fluxcd.io/flux/components/image/reflector-api/v1/
- containerd registry configuration documentation: https://containerd.org/docs/1.7/cri/registry/
- containerd hosts.toml documentation: https://github.com/containerd/containerd/blob/main/docs/hosts.md
- Harbor proxy cache documentation: https://goharbor.io/docs/main/administration/configure-proxy-cache/
- Amazon ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html

## Issues Found
- The `apps/v1` Deployment example omitted `.spec.selector` and matching pod template labels, which are required for a valid Deployment. Added `selector.matchLabels` and matching `template.metadata.labels`.
- The containerd mirror example used the deprecated `registry.mirrors` configuration pattern. Replaced it with the current `config_path` plus `/etc/containerd/certs.d/docker.io/hosts.toml` pattern for containerd 1.x.
- The ECR section said to use the ECR credential helper, but the example implemented a Kubernetes pull-secret refresh CronJob. Updated the wording to describe automatic pull-secret refresh and clarified that the utility image must include both `aws` and `kubectl`.
- The ECR CronJob example implied that refreshing a secret in `flux-system` was enough for all image pulls. Added a note that workload namespaces need the same pattern when they use ECR pull secrets.
- The multi-registry failover example implied that `imagePullSecrets` could provide fallback registries. Updated the explanation to say secrets only provide credentials, and changed the example to a Kustomize patch that rewrites the image reference to a backup registry.

## Review Notes
- The Flux `ImageRepository` fields shown (`image`, `interval`, `timeout`, and `secretRef`) match the current Flux image-reflector API.
- The AWS ECR 12-hour token lifetime and `aws ecr get-login-password` usage are consistent with AWS documentation.
- The `imagePullPolicy: IfNotPresent` guidance is technically correct for reducing registry dependency, but teams using mutable tags should combine it with immutable tags or digests to avoid stale-image rollouts.
