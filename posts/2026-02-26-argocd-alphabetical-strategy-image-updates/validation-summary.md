# Validation Summary: How to Use Alphabetical Strategy for Image Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- GitOps
- Kubernetes
- Kustomize
- Helm
- Container image tags
- `kubectl`
- `crane`

## Sources Consulted
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/latest/configuration/images/
- Argo CD Image Updater update methods and Git write-back targets: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Argo CD Image Updater migration guide for legacy annotations: https://argocd-image-updater.readthedocs.io/en/stable/configuration/migration/
- Argo CD Image Updater source code for alphabetical sorting behavior: https://github.com/argoproj-labs/argocd-image-updater
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `crane` command documentation: https://pkg.go.dev/github.com/google/go-containerregistry/cmd/crane
- Docker image tag/reference documentation: https://docs.docker.com/engine/reference/commandline/tag/

## Issues Found
- The post claimed alphabetical sorting could be reversed with `argocd-image-updater.argoproj.io/myapp.sort-mode: desc`. Argo CD Image Updater does not document or implement that per-image annotation. Updated the section to explain that alphabetical selection uses ascending lexical order and the tag format should make newer tags sort higher.
- The `ignore-tags` example used `regexp:-debug$`, but Argo CD Image Updater `ignore-tags` uses glob patterns, not the `regexp:` match function used by `allow-tags`. Changed it to `*-debug`.
- The comparison with `latest` described selection by push timestamp. Current Image Updater documentation names the strategy `newest-build` and describes it as using image creation/build date metadata. Updated the table and explanatory text accordingly.
- The complete example used `release-2026-02-26-ghi9012`, which did not match the post's own `[a-f0-9]{7}` regex. Replaced it with a valid hexadecimal-looking short SHA.
- The timestamp example in the introduction was inconsistent with the later `YYYYMMDDHHmmss` format. Updated it to `20260226153045`.
- The invalid date-tag example with slashes was vague. Clarified that slashes are not valid in image tags.

## Review Notes
- The post uses legacy Application annotations. The current Argo CD Image Updater documentation emphasizes the newer `ImageUpdater` CRD model, but the migration guide still documents the annotation mapping, so the examples remain technically valid for annotation-based configurations.
- The `latest` strategy name remains recognized as an older alias in the documentation, but `newest-build` is the preferred current name.
