# Validation Summary: How to Migrate GitRepository Between Flux Installations

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux GitRepository, Kustomization, HelmRelease, Alert, Provider, and Receiver resources
- Kubernetes custom resources and secrets
- kubectl
- YAML
- Bash

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux export source git command reference: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux export kustomization command reference: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux export helmrelease command reference: https://fluxcd.io/flux/cmd/flux_export_helmrelease/
- Flux export alert command reference: https://fluxcd.io/flux/cmd/flux_export_alert/
- Flux export alert-provider command reference: https://fluxcd.io/flux/cmd/flux_export_alert-provider/
- Flux suspend command reference: https://fluxcd.io/flux/cmd/flux_suspend/
- Flux get all command reference: https://fluxcd.io/flux/cmd/flux_get_all/
- Kubernetes custom resources documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/

## Issues Found
- The post implied that `flux export source git --all` exports all GitRepository resources globally. Flux export commands use the selected namespace by default, so I clarified that `--all` applies within the selected namespace and that the command should be repeated with `--namespace` for other namespaces.
- The post stated that secrets are not included in `flux export` output. The Flux CLI supports `flux export source git <name> --with-credentials`, so I narrowed the statement to the examples shown and kept the separate secret export workflow.
- The secret export script only handled GitRepository secrets in `flux-system`, even though the inventory step covers all namespaces. I updated it to collect namespace/name pairs from all GitRepository resources and export each referenced secret from its own namespace.
- The manual metadata cleanup example used `grep -v`, which does not safely remove nested `managedFields` YAML. I replaced it with a `yq del(...)` expression.
- Notification resources were applied in an order where Alerts could be applied before their Providers. I changed the apply order to apply alert providers before alerts.
- The API-version conversion example replaced `source.toolkit.fluxcd.io/v1` with itself. I corrected it to show converting an older `source.toolkit.fluxcd.io/v1beta2` manifest to `source.toolkit.fluxcd.io/v1`.

## Review Notes
The local workspace did not have `flux` or `kubectl` installed, so CLI checks were verified against the official Flux command reference instead of local `--help` output. The post remains version-sensitive: migrations from much older Flux installations can require schema-aware review beyond a simple `apiVersion` replacement.
