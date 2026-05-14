# Validation Summary: How to Implement GitOps Pull Request Validation with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize / Flux Kustomization resources
- Flux HelmRelease resources
- GitHub Actions
- GitHub CLI and branch protection API
- kubeconform
- yamllint
- yq
- Bash

## Sources Consulted
- Flux CLI `flux build kustomization` documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- kubeconform README and schema template variables: https://github.com/yannh/kubeconform
- GitHub Actions workflow syntax and permissions documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub REST API issue comments documentation: https://docs.github.com/rest/issues/comments
- GitHub REST API branch protection documentation: https://docs.github.com/rest/branches/branch-protection/
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- Helm install script source: https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
- Mike Farah yq documentation: https://mikefarah.gitbook.io/yq/

## Issues Found
- The kubeconform Flux schema path used `/tmp/flux-schemas/{{ .ResourceKind }}_{{ .ResourceAPIVersion }}.json`, but Flux release schema files are named with kubeconform's `ResourceKind` plus `KindSuffix` format, such as `kustomization-kustomize-v1.json`. Updated the schema location to `/tmp/flux-schemas/{{ .ResourceKind }}{{ .KindSuffix }}.json` so Flux CRDs are actually validated instead of being skipped as missing schemas.
- The kubeconform install step extracted into `/usr/local/bin` without `sudo`, which can fail on GitHub-hosted Ubuntu runners. Updated the command to use `sudo tar xz -C /usr/local/bin`.
- The Flux build snippet read `.kind`, `.metadata.name`, and `.spec.path` directly with yq, which is fragile for multi-document YAML and non-Kustomization files. Updated it to select only Flux `Kustomization` documents with a non-null `spec.path`.
- The first Flux build correction used a pipeline into `while`, which would have kept the `ERRORS` counter in a subshell. Updated it to use process substitution so failed builds correctly fail the job.
- The HelmRelease validation snippet piped `find` into `while`, so updates to `ERRORS` could be lost due to Bash subshell behavior. Updated it to use process substitution.
- The HelmRelease validation snippet only checked a file-level `.kind`, so multi-document YAML containing a HelmRelease could be missed. Updated it to select HelmRelease documents within each YAML file.
- The validation summary job omitted the `overlay-consistency` job from `needs`, so its result was not represented in the PR comment. Added it to the dependency list and summary table.
- The branch protection `gh api` command passed JSON objects as string fields. Updated it to use GitHub CLI nested field syntax and added `restrictions=null`, producing the object payload expected by the GitHub branch protection API.
- The branch protection contexts omitted the overlay consistency check. Added `Overlay Consistency Check`.
- The local validation script claimed to run all checks but only ran a subset. Updated the surrounding text and script comment to describe these as core checks.
- The local kubeconform example did not include Flux CRD schemas. Added the same Flux schema download and schema-location pattern used in CI.
- The local Flux build script used yq but only checked for the Flux CLI. Updated the prerequisite check to require both `flux` and `yq`.
- The local Flux build script also read Kustomization fields directly. Updated it to select Kustomization documents with yq, matching the CI correction.

## Review Notes
- The overlay consistency check is syntactically valid, but it only verifies that environment overlay directories exist. It does not prove that overlays contain matching resources or patches.
- The HelmRelease validation checks key fields but does not render charts or verify referenced sources. That is acceptable for the scope of the post, but teams may want stricter validation in production.
- `-ignore-missing-schemas` is useful for mixed repositories, but it can hide CRDs that do not have schemas configured. The corrected Flux schema location reduces that risk for Flux resources.
