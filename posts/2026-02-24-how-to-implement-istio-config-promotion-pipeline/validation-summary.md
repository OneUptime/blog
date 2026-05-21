# Validation Summary: How to Implement Istio Config Promotion Pipeline

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Kubernetes
- Kustomize
- GitHub Actions
- Argo CD ApplicationSet
- Flux
- kubeconform
- GitHub CLI
- Git

## Sources Consulted
- Istio `istioctl analyze` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio 1.22 end-of-life announcement: https://istio.io/latest/news/support/announcing-1.22-eol/
- Istio 1.30 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- GitHub Actions deployment environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Actions workflow commands / `GITHUB_ENV` documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Go template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- kubeconform CRD support documentation: https://kubeconform.mandragor.org/docs/crd-support/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The promotion script created its branch from `main`, which would make the promoted diff empty when the change already exists on the current branch. Changed it to create the branch from the current work and compare `main...HEAD`.
- `istioctl analyze` was shown without `--use-kube=false` for local rendered manifests. Added `--use-kube=false` so the validation works in CI without requiring a live cluster connection.
- The GitHub Actions workflow installed Istio 1.22.0, which is no longer supported. Updated the example to Istio 1.30.0, the current release as of this review.
- `KUBECONFIG` was exported inside one GitHub Actions step and then used in later steps. GitHub Actions does not preserve shell exports between steps, so the workflow now writes `KUBECONFIG=/tmp/kubeconfig` to `$GITHUB_ENV`.
- The staging load test used `hey` without installing it. Changed the command to `go run github.com/rakyll/hey@latest ...` so the example can run on a standard GitHub-hosted runner with Go available.
- The ApplicationSet example templated boolean fields and always emitted `syncPolicy.automated`, which would still enable automated sync for production. Updated it to use Go templating with `templatePatch`, only adding automated sync for environments with `autoSync: "true"`.
- The ApplicationSet example put cluster names in `destination.server`. Changed this to `destination.name`, which is the Argo CD field for named clusters.

## Review Notes
The corrected examples are technically valid, but real production use should pin tool versions consistently, install or cache all CLI dependencies explicitly, and ensure Argo CD cluster names match registered cluster secrets.
