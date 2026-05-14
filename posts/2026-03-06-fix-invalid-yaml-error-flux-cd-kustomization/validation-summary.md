# Validation Summary: How to Fix 'invalid YAML' Error in Flux CD Kustomization

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes manifests and kubectl
- YAML
- Kustomize
- yamllint
- kubeconform
- pre-commit
- GitHub Actions
- VS Code YAML settings

## Sources Consulted
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes configuration best practices for YAML boolean handling: https://v1-32.docs.kubernetes.io/docs/concepts/configuration/overview/
- Kubernetes API concepts for duplicate and unknown field validation: https://kubernetes.io/docs/reference/using-api/api-concepts/
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- yamllint configuration and rule documentation: https://yamllint.readthedocs.io/en/stable/configuration.html and https://yamllint.readthedocs.io/en/stable/rules.html
- kubeconform README and CLI option documentation: https://github.com/yannh/kubeconform
- pre-commit documentation: https://pre-commit.com/
- yamllint pre-commit hook metadata: https://raw.githubusercontent.com/adrienverge/yamllint/v1.35.0/.pre-commit-hooks.yaml

## Issues Found
- The tab replacement commands used `sed -i ''`, which is macOS/BSD sed syntax, without saying so. Added separate macOS/BSD and Linux/GNU sed examples, and made the recursive examples handle both `.yaml` and `.yml` files safely.
- The YAML boolean trap example listed quoted `"no"`, `"No"`, and `"off"` under values interpreted as booleans. Quoted values are strings, so the example now shows unquoted `no`, `No`, `NO`, `off`, `Off`, and `OFF`, followed by a note to quote them when string values are intended.
- The pre-commit example used `repo: https://github.com/yannh/kubeconform` with `id: kubeconform`, but the kubeconform repository does not publish a pre-commit hook for that tag. Replaced it with a `repo: local` system hook that runs an installed `kubeconform` binary.
- The GitHub Actions kubeconform command triggered on `.yml` files but only validated `.yaml` files. Updated the `find` command to include both extensions and use null-delimited paths.
- The quick YAML syntax check used `yaml.safe_load`, which only reads one document. Updated it to `yaml.safe_load_all` so multi-document Kubernetes YAML files are checked.

## Review Notes
- The remaining Flux, kubectl, yamllint, kubeconform, Kustomize, YAML indentation, block scalar, duplicate-key, document separator, and VS Code settings examples are technically sound for the scope of the guide.
- `kubeconform` validates against Kubernetes OpenAPI schemas and does not cover every server-side validation performed by Kubernetes controllers; the post's wording is acceptable, but that caveat could be expanded in a future revision.
