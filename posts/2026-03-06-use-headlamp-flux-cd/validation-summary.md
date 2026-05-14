# Validation Summary: How to Use Headlamp with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Headlamp
- Flux CD
- Kubernetes
- Helm and Flux HelmRelease
- Kubernetes RBAC and ServiceAccount tokens
- OIDC
- Kubernetes Ingress

## Sources Consulted
- Headlamp in-cluster installation documentation: https://headlamp.dev/docs/latest/installation/in-cluster/
- Headlamp authentication documentation: https://headlamp.dev/docs/latest/installation/
- Headlamp OIDC documentation: https://headlamp.dev/docs/latest/installation/in-cluster/oidc/
- Headlamp plugin building and deployment documentation: https://headlamp.dev/docs/latest/development/plugins/building/
- Headlamp Helm chart repository index: https://kubernetes-sigs.github.io/headlamp/index.yaml
- Headlamp Helm chart values.yaml for chart 0.42.0: https://github.com/kubernetes-sigs/headlamp/releases/download/headlamp-helm-0.42.0/headlamp-0.42.0.tgz
- Headlamp Flux plugin repository README and source: https://github.com/headlamp-k8s/plugins/tree/main/flux
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes ServiceAccount token administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
- The Headlamp Helm repository URL used `https://headlamp-k8s.github.io/headlamp/`, which now returns a GitHub Pages 404. Updated it to the official current repository URL, `https://kubernetes-sigs.github.io/headlamp/`.
- The Headlamp chart version was pinned to `0.24.x`, which is outdated for the 2026 review date. Updated chart examples to `0.42.x`, matching the current chart line.
- The initial Headlamp Helm values enabled a PVC for plugins without mounting it and omitted `accessModes`. Added the corresponding `volumeMounts`, `volumes`, and `ReadWriteOnce` access mode.
- The macOS desktop install command used `brew install headlamp`. Updated it to `brew install --cask headlamp`.
- The service account token example created a long-lived `kubernetes.io/service-account-token` Secret. Updated it to use `kubectl create token`, which is the current Kubernetes v1.24+ approach.
- The Flux plugin CLI command `npx @kinvolk/headlamp-plugin install flux` was not supported by the current official installation guidance. Replaced it with the desktop Plugin Catalog guidance and the in-cluster plugin image approach.
- The in-cluster plugin deployment was described as a ConfigMap and used invalid Headlamp chart values (`extraVolumes`, `extraVolumeMounts`) plus a non-existent release tarball URL. Updated it to use the official `ghcr.io/headlamp-k8s/headlamp-plugin-flux:latest` init container pattern with supported chart values.
- The plugin deployment set `config.pluginsDir` to `/headlamp/plugins` while mounting plugins at `/build/plugins`. Corrected `pluginsDir` to `/build/plugins`.
- The Flux plugin UI claims included release history, rollback options, Helm test results, and pod logs, which are not shown by the current plugin source. Narrowed the claims to status, conditions, values, dependencies, inventory resources, and events.
- The OIDC example omitted the Headlamp callback URL. Added `callbackURL: https://headlamp.example.com/oidc-callback`.
- The multi-cluster example used an unsupported `clusters.json` ConfigMap format. Replaced it with the documented kubeconfig mounting and `KUBECONFIG` approach.
- The troubleshooting CRD check used `grep fluxcd`, which does not match Flux CRD names such as `kustomizations.kustomize.toolkit.fluxcd.io`. Updated it to `grep toolkit.fluxcd.io`.
- The plugin troubleshooting path checked `/headlamp/plugins/` even though the corrected plugin deployment uses `/build/plugins/`. Updated the command accordingly.

## Review Notes
The post is technically relevant and valid after correction. The examples still use broad `cluster-admin` access for simplicity; production deployments should prefer least-privilege RBAC where practical.
