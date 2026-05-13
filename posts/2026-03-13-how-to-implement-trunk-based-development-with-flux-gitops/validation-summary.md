# Validation Summary: How to Implement Trunk-Based Development with Flux GitOps

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Flux GitOps
- Kubernetes
- Kustomize
- GitHub Actions
- GitHub CLI
- Git
- Docker image tagging
- Trunk-based development

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image reflector API reference: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- GitHub Actions variables documentation: https://docs.github.com/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions expressions documentation: https://docs.github.com/en/actions/learn-github-actions/expressions
- Local Git CLI help output for `git commit`
- Trunk-based development reference: https://trunkbaseddevelopment.com/short-lived-feature-branches/

## Issues Found
- The production Flux example said production tracked `main`, but `clusters/production/apps.yaml` only defined a `Kustomization` and omitted the matching `GitRepository` source. Added the production `GitRepository` so the production cluster explicitly tracks the `main` branch like the staging example.
- The production promotion commands edited the production Kustomize file and then ran `git commit`, but did not stage the changed file. Added `git add apps/production/web-app/kustomization.yaml` before the commit.
- The GitHub Actions workflow created `TAG` in the "Build and push image" step and used it again in a later step. Shell variables do not persist across steps by default, so the release tagging step would fail or use an empty tag. Added `echo "TAG=$TAG" >> "$GITHUB_ENV"` so subsequent steps can use the generated tag.
- The example `apps/base/web-app/deployment.yaml` used `apps/v1` Deployment but omitted `.spec.selector` and matching `.spec.template.metadata.labels`. Added both fields so the Deployment manifest is valid for Kubernetes `apps/v1`.

## Review Notes
- Flux `source.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`, and `image.toolkit.fluxcd.io/v1` are current API groups in the official Flux documentation.
- The Flux image policy marker and `ImageUpdateAutomation` `Setters` strategy match the current Flux image automation documentation.
- The YAML snippets were parsed successfully after the fixes.
