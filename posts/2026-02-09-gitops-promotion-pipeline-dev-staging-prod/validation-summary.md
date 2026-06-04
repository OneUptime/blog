# Validation Summary: How to Build a GitOps Promotion Pipeline Across Dev Staging

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GitOps promotion strategies
- Flux GitRepository and Kustomization resources
- Flux ImageRepository, ImagePolicy, and image update markers
- Argo CD ApplicationSet
- GitHub Actions workflows and environments
- Git, Docker, kubectl, and Flux CLI commands
- Kubernetes Deployment manifests

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation and API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/ and https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux ImagePolicy and ImageRepository documentation: https://fluxcd.io/flux/components/image/imagepolicies/ and https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI documentation for `flux get image policy` and `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_get_images_policy/ and https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Argo CD ApplicationSet generator, template, and specification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes Deployment documentation and API reference: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- GitHub Actions checkout marketplace page: https://github.com/marketplace/actions/checkout
- GitHub Actions environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub CLI release creation manual: https://cli.github.com/manual/gh_release_create
- kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate

## Issues Found
- Added the missing Flux `ImageRepository` resource before the `ImagePolicy` examples. Flux ImagePolicy objects require an `imageRepositoryRef` that points to an existing ImageRepository.
- Fixed the Kubernetes Deployment examples by adding `spec.selector.matchLabels` and matching `spec.template.metadata.labels`. In `apps/v1`, Deployment selectors are required and must match the pod template labels.
- Updated GitHub Actions examples from `actions/checkout@v3` to `actions/checkout@v4` and added `permissions: contents: write` for workflows that push branches, tags, or releases.
- Replaced the archived `actions/create-release@v1` example with the official `gh release create` command using `GH_TOKEN`.
- Quoted the Slack webhook expression in the `curl` command so shell metacharacters in the URL do not break the command.
- Fixed the Argo CD ApplicationSet example. The original snippet templated boolean fields (`prune` and `selfHeal`) as strings, but ApplicationSet templating only applies safely to string fields. The updated example uses Go templating with `templatePatch` to conditionally add boolean sync policy fields.
- Changed the ApplicationSet generated destination from `server: '{{cluster}}'` to `name: '{{.cluster}}'` because the example values are cluster names rather than Kubernetes API server URLs.
- Replaced the repeated `kubectl annotate` Flux sync trigger with `flux reconcile source git flux-system -n flux-system`, the documented Flux CLI command for reconciling a GitRepository source.

## Review Notes
The remaining examples are intentionally simplified and assume the referenced Git repositories, cluster names, secrets, Flux controllers, Argo CD installation, GitHub environment protection rules, and registry credentials already exist. For a production article, the image automation section could later include a complete `ImageUpdateAutomation` example, but the current statements are technically accurate after the fixes.
