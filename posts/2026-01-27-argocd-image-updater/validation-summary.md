# Validation Summary: How to Implement ArgoCD Image Updater Automation

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Argo CD
- Argo CD Image Updater
- Helm
- Kustomize
- Container registries: Docker Hub, GHCR, Amazon ECR, GCR, Artifact Registry
- Prometheus ServiceMonitor
- GitOps write-back workflows

## Sources Consulted
- Argo CD Image Updater v1.x overview and migration note: https://argocd-image-updater.readthedocs.io/en/stable/
- Argo CD Image Updater annotation-based v0.18 installation docs: https://argocd-image-updater.readthedocs.io/en/release-0.18/install/installation/
- Argo CD Image Updater v0.12 update strategies docs: https://argocd-image-updater.readthedocs.io/en/release-0.12/basics/update-strategies/
- Argo CD Image Updater v0.12 update methods docs: https://argocd-image-updater.readthedocs.io/en/release-0.12/basics/update-methods/
- Argo CD Image Updater v0.12 image annotation docs: https://argocd-image-updater.readthedocs.io/en/release-0.12/configuration/images/
- Argo CD Image Updater v0.12 registry configuration docs: https://argocd-image-updater.readthedocs.io/en/release-0.12/configuration/registries/
- Argo Helm argocd-image-updater chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argocd-image-updater/values.yaml
- Argo Helm chart index: https://argoproj.github.io/argo-helm/index.yaml

## Issues Found
- The post used annotation-based Argo CD Image Updater configuration while installing the current `stable` release, which is now CRD-based in v1.x. Added a version caveat, changed the kubectl manifest to `latest-annotation-based`, and pinned the Helm chart to `0.14.0`, which targets the annotation-based release line.
- SemVer constraints were shown as non-existent `<alias>.semver-constraint` annotations. Moved constraints into the `image-list` annotation, which is the documented annotation-based format.
- The `latest` strategy was described as selecting the most recently pushed image. Corrected this to the most recent image build date.
- Registry credentials were shown in invalid formats. Updated Docker Hub, GHCR, ECR, and GCR examples to use `username:password` style values or external scripts that emit that format.
- The `argocd` write-back method was described as creating `.argocd-source-<app>.yaml`. Corrected it to direct Application parameter updates; Git write-back is the method that writes files to the repository.
- The custom commit message example was shown as an Application annotation, but annotation-based Image Updater configures commit templates through the updater ConfigMap. Removed the invalid annotation from the Application example.
- `ignore-tags` examples used `regexp:` syntax, but the documented annotation expects comma-separated glob patterns. Replaced those values with glob patterns.
- Metrics names included non-existent names. Replaced them with documented v0.x metrics such as `argocd_image_updater_images_watched_total` and `argocd_image_updater_images_errors_total`.
- The troubleshooting log-level command used an unsupported environment variable. Replaced it with a ConfigMap patch for `log.level` and a deployment restart.
- The force-update troubleshooting command implied an immediate check and used a global timestamp annotation. Replaced it with the documented per-image `<alias>.force-update=true` annotation and corrected the description.

## Review Notes
The post is now internally consistent with the annotation-based v0.x Argo CD Image Updater configuration model. A future refresh should consider rewriting the guide for the current v1.x `ImageUpdater` custom resource workflow instead of the legacy annotation model.
