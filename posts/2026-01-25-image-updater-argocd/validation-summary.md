# Validation Summary: How to Implement Image Updater in ArgoCD

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Argo CD Image Updater
- Argo CD Applications
- Kubernetes manifests, Secrets, ConfigMaps, and ServiceMonitor resources
- Helm
- Kustomize
- Container registries including Docker Hub, GHCR, AWS ECR, and GCR / Artifact Registry
- Git write-back workflows

## Sources Consulted
- Argo CD Image Updater installation documentation: https://argocd-image-updater.readthedocs.io/en/stable/install/installation/
- Argo CD Image Updater application configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater image configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update methods documentation: https://argocd-image-updater.readthedocs.io/en/stable/basics/update-methods/
- Argo CD Image Updater update strategies documentation: https://argocd-image-updater.readthedocs.io/en/stable/basics/update-strategies/
- Argo CD Image Updater registry configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo CD Image Updater migration guide: https://argocd-image-updater.readthedocs.io/en/stable/configuration/migration/
- Stable install manifest: https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/config/install.yaml
- Argo Helm chart repository: https://artifacthub.io/packages/helm/argo/argocd-image-updater

## Issues Found
- The post used Application annotations without the current prerequisite ImageUpdater custom resource. Added a minimal `ImageUpdater` CR with `useAnnotations: true` so annotation-based examples are valid with current releases.
- The basic Git write-back example used `targetRevision: HEAD`, which is not a suitable branch target for Git write-back unless a branch is specified separately. Changed it to `targetRevision: main`.
- The `latest` update strategy examples used the older strategy name and described it as most recently pushed. Changed examples to `newest-build` and clarified that selection is based on image build date.
- The `name` update strategy example used the older strategy name. Changed it to `alphabetical`.
- The Docker Hub per-image pull secret reference omitted the required credential source prefix. Changed it to `pullsecret:argocd/dockerhub-creds`.
- The registry Secret examples included a non-official Image Updater `secret-type` label. Removed the label so the examples rely on the Kubernetes Secret type and explicit `pullsecret:` reference.
- The commit message customization example used a non-existent Application annotation and incorrect template variables. Replaced it with the supported `git.commit-message-template` ConfigMap key and valid `.AppName` / `.AppChanges` template variables.
- The log commands referenced the older deployment name `argocd-image-updater`. Updated them to the current stable manifest deployment name `argocd-image-updater-controller`.
- The ServiceMonitor example used `port: metrics`, but the stable install manifest exposes the metrics service port as `https`. Updated the ServiceMonitor endpoint port.
- The troubleshooting command used `kubectl run --dry-run=client`, which only validates client-side pod creation and does not test registry access. Replaced it with `argocd-image-updater test` executed from the controller deployment.
- The rate limiting snippet placed `interval` under `registries.conf`, but registry rate limiting is configured with the `limit` property. Updated the example to use `limit: 10`.

## Review Notes
The post remains annotation-focused. Current Argo CD Image Updater documentation favors CRD-based configuration, but legacy annotations are still usable when selected by an `ImageUpdater` resource with `useAnnotations: true`.
