# Validation Summary: How to Install ArgoCD Core Without the UI

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Argo CD Core
- Argo CD CLI
- Kubernetes manifests and CRDs
- Kubernetes Secrets
- AppProject and Application resources
- Prometheus metrics

## Sources Consulted
- Argo CD Core documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/core/
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD CLI command references: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/
- Argo CD environment variables documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Official Argo CD stable manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/core-install.yaml and https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

## Issues Found
- The post said core mode installs only the Application Controller, Repo Server, and Redis. Current official core manifests also install the ApplicationSet Controller, so the component table, install explanation, and sample pod output were updated.
- The post described the Notifications Controller as optional in core mode. Official Argo CD Core documentation lists the Notification Controller as unavailable in core mode, and the current full install manifest includes it, so the table and switching instructions were corrected.
- The core install command used plain `kubectl apply`. Official Argo CD Core documentation uses server-side apply with `--force-conflicts`, so the install and upgrade commands were updated.
- The CLI section said the CLI communicates directly with Kubernetes and works without `argocd login`. Official core documentation says core CLI mode uses kubeconfig/Kubernetes RBAC and starts a local Argo CD API server process, with `argocd login --core` used to configure core access. The wording and command sequence were corrected.
- The metrics section listed `argocd_app_reconcile_count`, which is not the current documented metric. It was corrected to `argocd_app_reconcile`.
- The resource comparison listed fixed CPU and memory request savings that are not present in the current official manifests. It was changed to describe the workloads omitted by core mode instead of giving unsupported request values.

## Review Notes
The post now matches the current stable Argo CD documentation and manifests as of 2026-05-20. Future updates may be needed if the `stable` manifest changes, so pinning a specific Argo CD version in production documentation would be more reproducible.
