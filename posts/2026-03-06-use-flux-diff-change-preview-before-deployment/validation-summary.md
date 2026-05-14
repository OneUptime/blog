# Validation Summary: How to Use flux diff for Change Preview Before Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux CLI
- Flux Kustomization
- Flux HelmRelease
- Kubernetes Deployments
- GitHub Actions
- Bash
- yq

## Sources Consulted
- Flux CLI `flux diff kustomization` documentation: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux 2.3 GA announcement: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- actions/checkout recommended permissions: https://github.com/actions/checkout
- yq installation documentation: https://github.com/mikefarah/yq

## Issues Found
- The post described `flux diff` as fetching live cluster state directly. Updated the explanation to match Flux documentation: it builds the manifests, performs a server-side dry-run, and prints the diff.
- The prerequisites said Flux CLI v2.0 or later, but the post uses `helm.toolkit.fluxcd.io/v2` HelmRelease examples, which were promoted in Flux v2.3. Updated the prerequisite to Flux CLI v2.3 or later.
- The GitHub Actions and selective diff examples used `--path ".${path}"` / `--path ".${PATH_FIELD}"`, which turns a Flux path like `./infrastructure/...` into `../infrastructure/...`. Changed these to pass the path value directly.
- The GitHub Actions example used `yq` without installing it and the local scripts also depended on it implicitly. Added `yq v4` to prerequisites and installed it in the GitHub Actions workflow that uses it.
- The pull request workflow specified `pull-requests: write` but not `contents: read`, which is the recommended permission for `actions/checkout` when job permissions are explicitly scoped. Added `contents: read`.
- The automation examples swallowed all nonzero `flux diff` exit codes with `|| true`, even though Flux documents exit code `1` as differences and `>1` as errors. Updated the scripts to treat exit code `1` as changes and fail on higher exit codes.
- The pull request workflow built markdown output using literal `\n` sequences in a Bash string. Reworked the snippet to append markdown with `printf` so the PR comment renders correctly.
- The selective diff script did not guard against unmatched glob entries. Added a file existence check before parsing each Kustomization file.

## Review Notes
The examples are technically valid after the fixes. Future improvements could include pinning GitHub Actions to immutable SHAs for supply-chain hardening and replacing the simple `grep`-based Deployment filter with a structured manifest/diff parser if the workflow needs precise resource selection.
