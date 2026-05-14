# Validation Summary: How to Implement Code Review Workflows for Flux CD Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- GitOps
- GitHub Actions
- GitHub CLI
- Kustomize
- Kubernetes manifests
- kubeconform
- Kyverno CLI
- Trivy GitHub Action
- PyYAML

## Sources Consulted
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- GitHub REST API issue comments documentation: https://docs.github.com/en/rest/issues/comments
- GitHub Actions `GITHUB_TOKEN` permissions documentation: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitHub CLI `gh pr diff` manual: https://cli.github.com/manual/gh_pr_diff
- GitHub CLI `gh pr view` manual: https://cli.github.com/manual/gh_pr_view
- kubeconform README and usage documentation: https://github.com/yannh/kubeconform
- Kyverno CLI `apply` documentation: https://main.kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found
- The diff-preview script accumulated literal `\n` sequences in a shell variable and wrote them with `echo`, which could produce a poorly formatted PR comment. Updated it to write Markdown with `printf` directly to the output file and added a guard for an unmatched `clusters/*/` glob.
- The GitHub Script comment creation call was not awaited. Added `await` so the workflow waits for the REST request to complete.
- The YAML syntax validation snippet used `import yaml` without ensuring PyYAML was installed and interpolated filenames directly into Python source. Added Python setup plus a PyYAML install step, and passed the filename through an environment variable while using `read -r`.
- The Kyverno policy check claimed to run policies against built manifests but passed the source `clusters/` tree directly. Added Kustomize setup and a build loop that writes rendered manifests to `/tmp/kyverno-resources/`, then points Kyverno at that directory.
- The pull request template example was shown as commented YAML, which would not render as a usable Markdown PR template. Changed the code fence to Markdown and showed the actual checkbox template content.
- The production approval workflow did not explicitly scope `GITHUB_TOKEN` permissions and counted all historical approved reviews, including duplicate or stale approvals from the same reviewer. Added read permissions and changed the `gh pr view` query to count only each reviewer's latest review state.
- The review-checklist workflow scoped `GITHUB_TOKEN` to pull requests but omitted `contents: read`, which can break checkout after explicit permissions are set. Added `contents: read`.
- The post-merge verification workflow used the `flux` command without installing the Flux CLI and set `KUBECONFIG` to the secret content instead of a file path. Added the official Flux setup action, wrote the kubeconfig secret to a temporary file, and pointed `KUBECONFIG` at that file.
- The diff-preview wording said it showed exactly what would change in the cluster. Narrowed the claim to rendered manifest changes, since the sample does not perform a live server-side diff against cluster state.

## Review Notes
- The examples are technically valid as review workflow patterns, but production use should still consider pinning third-party GitHub Actions to immutable SHAs and adding branch protection rules that require the validation and production-gate checks before merge.
