# Validation Summary: How to Unit Test Kustomize Overlays Before ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- Kubeconform
- Conftest
- Open Policy Agent Rego
- yq
- KUTTL
- GitHub Actions

## Sources Consulted
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Kubeconform README and CLI options: https://github.com/yannh/kubeconform
- Conftest documentation: https://www.conftest.dev/
- Open Policy Agent Rego policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- yq eval command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- KUTTL configuration reference: https://kuttl.dev/docs/testing/reference.html
- KUTTL test steps documentation: https://kuttl.dev/docs/testing/steps.html
- RFC 6902 JSON Patch specification: https://www.rfc-editor.org/rfc/rfc6902
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The Rego policy examples used legacy `deny[msg]` syntax. Updated them to current Rego v1-style `deny contains msg if` syntax shown in the official OPA and Conftest documentation.
- The KUTTL `TestStep` used `command` with a shell pipeline. KUTTL documents that `command` executes a single binary with arguments and does not support pipes, so this was changed to `script`.
- The snapshot section was titled "Snapshot Testing with kustomize-assert" but the post only demonstrated golden-file snapshots with `diff`, not a `kustomize-assert` tool. Renamed the heading to "Snapshot Testing with Golden Files."
- The GitHub Actions workflow ran Conftest but did not install it. Added a Conftest installation step using the official GitHub release download pattern.

## Review Notes
- The Kubeconform flags and CRDs-catalog schema-location pattern match the official kubeconform documentation.
- The Kustomize inline JSON patch format matches Argo CD's Kustomize patch examples, and RFC 6902 confirms that `replace` requires the target path to exist.
- The GitHub Actions workflow assumes `snapshot-test.sh` exists in the repository and is executable.
