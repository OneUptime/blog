# Validation Summary: How to Structure a Repo per Application for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux GitRepository, Kustomization, ImageRepository, ImagePolicy, and ImageUpdateAutomation resources
- Kubernetes Deployments, Services, Ingress, ConfigMaps, and HorizontalPodAutoscalers
- Kustomize bases, overlays, patches, labels, and image editing
- GitHub Actions
- Docker CLI
- Bash

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- GitHub Actions GITHUB_TOKEN documentation: https://docs.github.com/en/actions/security-guides/automatic-token-authentication
- actions/checkout documentation: https://github.com/actions/checkout
- Docker push documentation: https://docs.docker.com/reference/cli/docker/image/push/

## Issues Found
- The Flux `ImageUpdateAutomation` commit `messageTemplate` used `{{.NewTag}}`, which is not part of the current template data. Current Flux exposes automation changes through `.Changed`, so the template was updated to iterate over `.Changed.Changes` and print old-to-new image values.
- The GitHub Actions workflow pushed commits back to the repository without explicitly granting `contents: write` to `GITHUB_TOKEN`. Added workflow permissions so `git push` works under least-privilege token settings.
- The GitHub Actions workflow pushed a container image without authenticating to the registry. Added a Docker login step using registry credentials from GitHub Actions secrets before `docker push`.

## Review Notes
- The Flux CRD API versions used in the examples are current `v1` APIs.
- The Flux `postBuild.substitute` example matches current kustomize-controller behavior. Undefined substitutions without defaults become empty unless strict substitutions are enabled.
- The image automation example uses a SemVer image policy, so it assumes the registry publishes SemVer-compatible tags such as `1.0.0`. The earlier CI example uses commit-SHA tags; teams should align the tag format with their chosen Flux image policy.
