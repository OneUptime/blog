# Validation Summary: How to Set Up Runbooks for Common Flux CD Alerts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Prometheus and Alertmanager
- Helm and Flux HelmRelease
- Flux image reflector and notification controllers

## Sources Consulted
- Flux monitoring guide and `gotk_reconcile_condition` metrics: https://fluxcd.io/flux/guides/monitoring/
- Flux `get all` troubleshooting guidance: https://fluxcd.io/flux/cheatsheets/troubleshooting/
- Flux CLI reference for `flux get sources all`: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI reference for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI reference for `flux get images repository`: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux CLI reference for `flux tree kustomization`: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Flux CLI reference for `flux reconcile helmrelease --force`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The reconciliation failure discovery command only checked the default Flux namespace. Changed `flux get all --status-selector ready=false` to `flux get all --all-namespaces --status-selector ready=false` so it matches Flux troubleshooting guidance for finding failing resources across namespaces.
- The source discovery command only checked the default Flux namespace. Changed `flux get sources all` to `flux get sources all --all-namespaces` so GitRepository and HelmRepository objects outside `flux-system` are included.
- The `kubectl run` connectivity test commands passed `git` and `curl` as container arguments instead of explicitly overriding the container command. Added `--command --` to both commands, matching the official `kubectl run` syntax for running a different command.
- The Helm release resource conflict remediation said to use `--force` without specifying the Flux command. Reworded it to use `flux reconcile helmrelease <name> -n <namespace> --force`, which is the Flux-supported one-off forced install or upgrade mechanism.
- The ImageRepository remediation referred generically to "exclusion patterns." Updated it to name the current Flux field, `.spec.exclusionList`, which excludes tags from scan results.

## Review Notes
The alert names in the post are example Prometheus alert names rather than built-in Flux alert names. The Prometheus expression uses the documented `gotk_reconcile_condition` metric shape, and teams may still want to tune grouping labels and severities to match their kube-state-metrics and Alertmanager setup.
