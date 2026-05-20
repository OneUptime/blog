# Validation Summary: How to Migrate from Spinnaker to ArgoCD

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Argo CD Image Updater
- Kubernetes
- Helm
- Kustomize
- Spinnaker
- Spin CLI
- Prometheus
- GitOps

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo Rollouts BlueGreen strategy: https://argoproj.github.io/argo-rollouts/features/bluegreen/
- Argo Rollouts Canary strategy: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts Analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo CD Image Updater application configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Spinnaker Spin CLI pipeline guide: https://spinnaker.io/docs/guides/spin/pipeline/
- Argo Helm chart index: https://argoproj.github.io/argo-helm/index.yaml

## Issues Found
- The Spin CLI examples mixed `--output json` and `-o json`. The official Spin pipeline guide documents `--output`, so the examples now use `--output json` consistently.
- The pipeline export command did not explicitly request JSON output from `spin pipeline get`. Added `--output json` so the exported files match the stated pipeline configuration export.
- The Argo Rollouts Helm Application omitted `spec.project`. Added `project: default` to align with standard Argo CD Application manifests.
- The Argo Rollouts Helm chart version was pinned to older chart version `2.35.0`. Updated it to `2.40.9`, the current version in the official Argo Helm chart index at review time.
- The canary Rollout example only included `strategy` and omitted required Rollout pod-template fields. Added `replicas`, `selector`, and `template` so the manifest is structurally valid.
- The Image Updater example used only legacy Application annotations. Replaced it with the current `ImageUpdater` custom resource format from the official Image Updater documentation.
- The Spinnaker decommission verification command only printed pipeline disabled flags. Changed it to list enabled pipeline names, which better matches the stated purpose of verifying remaining active pipelines.

## Review Notes
The migration mappings are generally accurate as conceptual guidance, but some Spinnaker features such as Manual Judgment, pipeline expressions, and Kayenta canary analysis do not have one-to-one Argo CD equivalents. Production migrations should still review RBAC, approval workflow requirements, metric provider compatibility, traffic routing behavior, and rollback expectations per application.
