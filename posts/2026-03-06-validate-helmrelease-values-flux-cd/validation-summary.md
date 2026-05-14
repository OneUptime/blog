# Validation Summary: How to Validate HelmRelease Values for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD HelmRelease
- Helm
- Kubernetes ConfigMaps and Secrets
- Bash
- yq
- JSON Schema
- GitHub Actions

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Helm `helm template` command documentation: https://helm.sh/docs/v3/helm/helm_template/
- Helm `helm pull` command documentation: https://helm.sh/docs/helm/helm_pull/
- Helm 3 JSON schema validation FAQ: https://v3-1-0.helm.sh/docs/faq/
- Helm charts schema file documentation: https://helm.sh/docs/v3/topics/charts/
- yq output format documentation: https://mikefarah.gitbook.io/yq/usage/output-format
- GNU Bash pipeline documentation: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html

## Issues Found
- The Bash examples used `find ... | while read ...`, which runs the loop body in a subshell in Bash. As a result, `ERRORS` and `WARNINGS` increments would not be visible after the loop, causing failed checks to report success. The loops now use process substitution so counters are updated in the current shell.
- The HelmRepository lookup used a plain `grep` for `name: $REPO_NAME`, which could match a HelmRelease `sourceRef` or another resource instead of a HelmRepository. The examples now use `yq` to select objects with `kind: HelmRepository` and matching `metadata.name`.
- The schema validation script attempted to pull charts without adding the referenced Helm repository. It now discovers the HelmRepository and adds it before `helm pull`.
- The rendering and schema sections implied they validated all HelmRelease values, but the scripts only extract `.spec.values` and do not merge `.spec.valuesFrom`. The wording now explicitly describes inline values and notes that referenced ConfigMaps or Secrets must be merged before rendering.
- The required-values configuration included `constraints` entries, but the script never enforced them. The unused constraints were removed from the example.
- The version check described availability and compatibility validation, but the script only checked exact version pinning and remediation settings. The section and script comments now match the actual checks.

## Review Notes
The examples are technically valid for inline HelmRelease values. A future improvement would be to add explicit `valuesFrom` resolution, including `valuesKey`, `targetPath`, `optional`, and Secret `.data` decoding, to match Flux's full value merge behavior.
