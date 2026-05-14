# Validation Summary: How to Set Up Automated Testing in CI/CD for Flux CD Manifests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- GitHub Actions
- Kubernetes
- Kustomize
- Helm and Flux HelmRelease resources
- kubeconform
- yamllint
- Trivy
- Kind
- Bash
- yq

## Sources Consulted
- Flux CLI documentation for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux guide for managing Helm releases: https://fluxcd.io/flux/guides/helmreleases/
- kubeconform documentation: https://github.com/yannh/kubeconform
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions expressions reference: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- Helm `helm template` documentation: https://helm.sh/docs/v3/helm/helm_template/
- Kubernetes `kubectl kustomize` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes `kubectl apply` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action

## Issues Found
- The `flux build kustomization` examples would try to query a live Kubernetes cluster in a typical CI runner. Added `--dry-run` and clarified that cluster-backed Secret and ConfigMap substitutions are skipped in dry-run mode, matching the Flux CLI documentation.
- The kubeconform installation extracted to `/usr/local/bin` without `sudo`, which can fail on GitHub-hosted runners. Updated the tar extraction command to use `sudo`.
- Several Bash snippets used `find ... | while read` loops and updated error counters inside a subshell, so failures could be lost. Replaced those loops with process substitution in the Helm repository discovery, HelmRelease rendering, secret detection, and local test runner examples.
- The HelmRelease rendering example assumed every HelmRelease used `.spec.chart.spec.sourceRef` with a `HelmRepository`. Updated it to skip unsupported sources such as chart references or Git/Bucket-backed charts and to omit `--version` when no version is specified.
- The Helm repository discovery step always ran `helm repo update`, which can fail when no repositories were added. Added a repository-list check before updating.
- The integration test installed `yq` nowhere but used it later. Added an explicit `yq` installation step.
- The integration test masked dry-run apply failures with `|| true`, causing the job to succeed even when server-side validation failed. Replaced this with explicit error counting and a failing exit status.
- The integration test used the standalone `kustomize` command without installing it. Changed the example to use `kubectl kustomize`, which is documented in the Kubernetes kubectl reference.
- The local Flux build example had the same live-cluster issue as the CI example. Added `--dry-run`.

## Review Notes
- The examples still intentionally use generic paths such as `clusters/`, `infrastructure/`, and `apps/`; readers must adapt them to their repository layout.
- Several third-party GitHub Actions are referenced by branch names such as `main` or `master`. That works, but pinning released versions or commit SHAs would be a stronger supply-chain practice for production workflows.
