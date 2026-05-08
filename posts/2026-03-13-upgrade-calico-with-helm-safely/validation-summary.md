# Validation Summary: How to Upgrade Calico with Helm Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- Helm
- helm-diff plugin
- Flux HelmRelease
- calicoctl

## Sources Consulted
- Calico official Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico official Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico v3.28.0 release manifests in the official Project Calico repository: https://github.com/projectcalico/calico/tree/v3.28.0/manifests
- Helm v3 `helm upgrade` command reference: https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm v3 `helm rollback` command reference: https://helm.sh/docs/v3/helm/helm_rollback/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The post used `--atomic` and described an "atomic flag" for automatic rollback. Current Helm v3 documentation lists `--rollback-on-failure` for that behavior, so the wording and command were updated.
- The Helm upgrade sequence did not explicitly apply the target Calico CRDs before upgrading. The post now applies the v3.28.0 `operator-crds.yaml` manifest before `helm upgrade`.
- The post targeted Calico v3.28.0 but did not mention the v3.28 OwnerReferences caveat for `projectcalico.org/v3` resources. A short pre-upgrade note was added.
- The Flux HelmRelease example updated only the chart version. Because Flux requires an explicit CRD policy to upgrade chart CRDs, `upgrade.crds: CreateReplace` was added.

## Review Notes
- The local environment did not have `helm` or `kubectl` installed, so CLI syntax was validated against official command references and Calico documentation rather than local `--help` output.
