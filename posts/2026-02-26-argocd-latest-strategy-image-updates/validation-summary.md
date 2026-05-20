# Validation Summary: How to Use Latest Strategy for Image Updates

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes Application manifests
- GitOps
- Helm
- Kustomize
- Docker/container registries
- GitHub Actions
- GitLab CI
- crane CLI

## Sources Consulted
- Argo CD Image Updater update strategies documentation: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/
- Argo CD Image Updater image configuration documentation: https://argocd-image-updater.readthedocs.io/en/latest/configuration/images/
- Argo CD Image Updater application configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater migration guide: https://argocd-image-updater.readthedocs.io/en/stable/configuration/migration/
- Argo CD Image Updater update methods documentation: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Argo CD Image Updater run command documentation: https://argocd-image-updater.readthedocs.io/en/stable/install/cmd/run/

## Issues Found
- The post described the `latest` strategy as selecting by registry push time. Current Argo CD Image Updater documentation says `latest`/`newest-build` selects by the image build or creation date, not the tag or registry push time. Updated the description, workflow steps, comparison table, and troubleshooting text.
- The post used the old `latest` strategy name throughout examples. Current documentation says `latest` has been renamed to `newest-build`, with `latest` still recognized but planned for future removal. Updated configuration examples to use `newest-build` and added a short compatibility note.
- The combined allow/ignore example used `ignore-tags: "regexp:-debug$"`. Argo CD Image Updater supports regex match functions for `allow-tags`, but `ignore-tags` uses comma-separated glob patterns and does not support regular expressions. Changed the example to `*-debug` and clarified the comment.
- The diagram used a commit-like tag containing non-hex characters even though the examples filter for hexadecimal short SHAs. Changed the selected example tag to a matching hexadecimal value.
- The Helm values write-back target omitted the leading `./` used in the official relative-path examples. Updated it to `helmvalues:./values.yaml`.

## Review Notes
The post uses legacy Application annotations. Current Argo CD Image Updater documentation emphasizes the `ImageUpdater` custom resource and provides a migration guide from annotations to CRDs, but it still documents annotation-based configuration as the legacy form. A future update could convert the examples to the CRD format.
