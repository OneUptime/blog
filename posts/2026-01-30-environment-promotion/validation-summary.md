# Validation Summary: How to Implement Environment Promotion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, ConfigMaps, annotations, and `kubectl rollout`
- Kustomize bases, overlays, image transforms, and patches
- GitHub Actions deployment workflows
- Docker GitHub Actions for image metadata, registry login, and image builds
- GitHub Container Registry
- Argo CD ApplicationSet and GitOps sync policies
- External Secrets Operator
- Prometheus / kube-state-metrics

## Sources Consulted
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Docker documentation for managing tags and labels with GitHub Actions: https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- Docker `metadata-action` documentation: https://github.com/docker/metadata-action
- Docker `build-push-action` documentation: https://github.com/docker/build-push-action
- Docker `login-action` documentation: https://github.com/docker/login-action
- GitHub Container Registry documentation: https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Actions deployments and environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- kube-state-metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/README.md

## Issues Found
- The GitHub Actions workflow pushed to `ghcr.io` without registry login or `packages: write` permission. Added explicit job permissions and a `docker/login-action@v4` step using `GITHUB_TOKEN`, and updated Docker actions to current documented major versions.
- The Argo CD ApplicationSet example templated boolean fields under `syncPolicy.automated`. Argo CD documents that Go templates apply only to string fields, so templating booleans is invalid. Reworked the example to use `goTemplate` plus `templatePatch`, enabling automated sync only for dev and staging while leaving production manual.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Current ExternalSecret examples use `external-secrets.io/v1`, so the manifest was updated to `v1`.
- The monitoring annotation example manually set `deployment.kubernetes.io/revision`, which Kubernetes documents as an internal Deployment-controller annotation used on ReplicaSets and not something users should modify manually. Replaced it with `kubernetes.io/change-cause`.

## Review Notes
- The YAML examples were checked with PyYAML and parsed successfully after edits.
- The `kubectl`, Kustomize, Git, and PromQL examples are generally correct, but the CI/CD workflow still assumes the runner has `kubectl`, `kustomize`, and Kubernetes credentials configured before deployment.
