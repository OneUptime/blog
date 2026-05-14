# Validation Summary: How to Suspend and Resume GitRepository in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes custom resources
- GitRepository source API
- kubectl
- Prometheus Operator
- kube-state-metrics

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `flux suspend source git` reference: https://fluxcd.io/flux/cmd/flux_suspend_source_git/
- Flux CLI `flux resume source git` reference: https://fluxcd.io/flux/cmd/flux_resume_source_git/
- Flux CLI `flux get sources git` reference: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/

## Issues Found
- The verification command used `flux get source git my-app`. Current official Flux CLI documentation lists `flux get sources git` for GitRepository source status, so the command was changed to `flux get sources git -n flux-system`.
- The controlled rollout example used `flux get kustomization staging-app`. Current official Flux CLI documentation lists `flux get kustomizations`, so the command was changed to `flux get kustomizations -n flux-system`.
- The Prometheus alert used `gotk_suspend_status{kind="GitRepository"}`, which is not a documented Flux metric. Flux documents custom resource state through kube-state-metrics using `gotk_resource_info` with labels such as `customresource_kind` and `suspended`, so the alert expression was updated accordingly and the text now notes the kube-state-metrics requirement.

## Review Notes
Flux docs note that setting `spec.suspend: false` has the same effect as removing the field, but removing it is often preferable for GitOps because manual hot patches are not overwritten by a declared `false` value in Git. The post already mentions both approaches, so no content change was required.
