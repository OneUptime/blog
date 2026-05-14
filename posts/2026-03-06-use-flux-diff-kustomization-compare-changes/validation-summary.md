# Validation Summary: How to Use flux diff kustomization to Compare Changes

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Kustomize / Flux Kustomizations
- GitOps workflows
- GitHub Actions
- Bash scripting

## Sources Consulted
- Flux CLI reference for `flux diff kustomization`: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux CLI reference for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/

## Issues Found
- The post described `flux diff kustomization` as fetching live resources and comparing them directly with local build output. The official Flux CLI documentation states that the command performs a build, then a server-side dry-run, and prints the diff. Updated the introduction and workflow description accordingly.
- The `--path` description said it simply points to the local Kustomization directory. The official Flux CLI documentation describes it as the local path matching the Flux Kustomization's `spec.path`. Updated the explanation for precision.
- The Bash examples treated any non-zero exit code as "changes found". Flux documents exit code `1` for differences and `>1` for command errors. Updated the scripts and exit-code explanation to distinguish differences from errors.
- The large-diff helper said it counted changed resources, but the command counts diff headers and may not equal a unique resource count. Updated the comment to avoid overstating what the command does.

## Review Notes
- The Flux CLI was not installed in the local environment, so validation was performed against the current official Flux documentation.
- The GitHub Actions example uses `fluxcd/flux2/action@main`, which is documented by Flux for installing the Flux CLI in workflows.
