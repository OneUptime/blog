# Validation Summary: How to Structure Separate Repos per Environment for Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux GitRepository and Kustomization APIs
- Kubernetes Kustomize patches
- GitHub repositories, CODEOWNERS, and branch protection
- Bash, Git, GitHub CLI, Perl

## Sources Consulted
- Flux `flux bootstrap github` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- GNU sed manual: https://www.gnu.org/software/sed/manual/html_node/Command_002dLine-Options.html
- Local `gh pr create --help` output
- Local `git clone --help` output

## Issues Found
- The post showed environment-specific Kustomize patches in a separate Flux Kustomization pointing at the environment repository. That would not patch resources rendered from `fleet-infra-base`; Flux renders each Kustomization from its own source. Updated the text and examples to put inline `.spec.patches` on the Flux Kustomization that renders the base GitRepository source.
- The promotion script used `sed -i ''`, which is macOS/BSD-specific and fails on typical GNU sed installations. Replaced it with a Perl in-place edit that works in the documented Bash script environment and scopes the replacement to YAML documents containing `name: fleet-infra-base`.
- The drift check grepped for `tag:` and then `fleet-infra-base` on the same line, but the shown YAML stores those values on different lines. Updated the version extraction to scan YAML files for `name: fleet-infra-base` followed by a `tag:` line.
- The CODEOWNERS example was fenced as `yaml`, but CODEOWNERS is a plain text format and the sample is not valid YAML. Changed the code fence to `text`.

## Review Notes
- The `flux` CLI was not installed locally, so Flux CLI details were verified against the official Flux command documentation rather than local `flux --help`.
- YAML snippets in the post were parsed successfully after the fixes.
- The ingress-nginx Helm values shown in the examples are valid for that chart, but ingress-nginx was retired and archived after the post date. Consider replacing it in a future content refresh if the examples are intended to recommend production components.
