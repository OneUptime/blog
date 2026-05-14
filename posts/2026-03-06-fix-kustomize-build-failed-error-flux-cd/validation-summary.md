# Validation Summary: How to Fix 'kustomize build failed' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Kustomize
- Kubernetes manifests
- kubectl
- YAML
- JSON Patch

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux reconcile command reference: https://fluxcd.io/flux/cmd/flux_reconcile/
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The post said Flux requires a `kustomization.yaml` file in the target directory. Flux documentation says `.spec.path` may point to a directory containing a `kustomization.yaml` file or plain YAMLs for which Flux generates one. Updated the text to clarify that this requirement applies to Kustomize overlays, while Flux can also reconcile plain YAML directories.
- The post recommended using `./` and no trailing slash for `spec.path`. Flux documents `spec.path` as a source-relative directory path, but does not require that exact formatting. Updated the comment to say the path must match the repository directory.
- The JSON6902 patch example added `/metadata/labels/environment`, which only works if the `metadata.labels` parent object already exists. Removed that operation so the example remains valid without an unstated prerequisite.
- The post suggested running `kustomize version` inside the `kustomize-controller` pod. Flux documents the controller image and release as the relevant way to identify controller behavior; the image should not be assumed to include a standalone `kustomize` CLI. Updated the command to check the controller image version and compare it with Flux release notes.

## Review Notes
- The remaining commands and snippets are technically sound for current Flux and Kubernetes usage.
- `kubectl apply --dry-run=client` catches basic local manifest issues, while `--dry-run=server` requires a reachable cluster and gives stronger API-server validation.
