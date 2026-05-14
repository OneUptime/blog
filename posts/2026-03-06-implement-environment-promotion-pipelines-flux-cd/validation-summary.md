# Validation Summary: How to Implement Environment Promotion Pipelines with Flux CD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD
- Flux Kustomization controller
- Flux image reflector and image automation controllers
- Kubernetes Deployments
- Kustomize overlays
- GitHub Actions
- GitHub CLI
- Git

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout documentation: https://github.com/actions/checkout
- GitHub CLI `gh pr create --help` output from the local installed CLI

## Issues Found
- The Flux image automation example did not mark the staging image field with an image policy setter, so `ImageUpdateAutomation` using the `Setters` strategy would not update the manifest. I changed the environment overlays to use Kustomize `images.newTag` fields and added the official Flux image policy marker to the staging `newTag`.
- The GitHub Actions workflows created commits without configuring `user.name` and `user.email`. I added the standard `github-actions[bot]` Git identity before each commit.
- The GitHub Actions workflows pushed branches and created pull requests without declaring the required `GITHUB_TOKEN` permissions. I added `contents: write` and `pull-requests: write`.
- The staging promotion workflow claimed to verify the image existed in dev but only printed the current dev tag. I added an explicit comparison and failure path.
- The original `sed` replacements matched the full image line and would remove inline Flux image policy comments. I updated the commands to replace only the `newTag` value.

## Review Notes
- The Flux `kustomize.toolkit.fluxcd.io/v1` and `image.toolkit.fluxcd.io/v1` API versions used in the examples are current.
- The `healthChecks`, `timeout`, `wait`, `filterTags`, numerical image policy, and `ImageUpdateAutomation` fields match current Flux documentation.
- The GitHub Actions `workflow_dispatch` input types `string` and `number` are valid.
- The soak-period gate is technically plausible, but using the last Git commit touching `apps/staging/` is only an approximation of actual runtime soak time.
