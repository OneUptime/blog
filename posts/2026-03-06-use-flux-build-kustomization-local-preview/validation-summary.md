# Validation Summary: How to Use flux build kustomization for Local Preview

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux Kustomization API
- Kustomize
- Kubernetes
- kubectl dry-run validation
- kubeconform
- GitHub Actions

## Sources Consulted
- Flux CLI command reference for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization documentation, including post-build variable substitution: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/

## Issues Found
- The post implied that `flux build kustomization apps --path ...` can be used without a cluster. Official Flux documentation states that the command queries the Kubernetes API by default and fetches the named Flux Kustomization. I clarified this behavior and changed the no-cluster example to use `--kustomization-file` with `--dry-run`.
- The CI example did not configure Kubernetes cluster access but used the default cluster-backed command form. I updated the example to use a local Flux Kustomization file and `--dry-run`, which matches the documented no-cluster workflow.
- The environment comparison example used the same Flux Kustomization name for staging and production while changing only `--path`. I updated it to use distinct Kustomization names so the fetched in-cluster specs match the intended environments.
- The resource-counting example counted YAML document separators, which can undercount resources if the first document is not preceded by `---`. I changed it to count `kind:` entries, matching the earlier resource-kind example.
- The common flags table omitted key flags needed for local/no-cluster builds. I added `--kustomization-file` and `--dry-run`, and clarified the default namespace behavior.

## Review Notes
The examples assume that local Flux Kustomization YAML files such as `apps-kustomization.yaml` and `infrastructure-kustomization.yaml` exist in the repository for no-cluster workflows. Future improvements could show a minimal local Flux Kustomization manifest, but no new section was added to keep the edit scoped to technical corrections.
