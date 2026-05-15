# Validation Summary: How to Create Alerts for HelmRelease Events in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Flux helm-controller
- Kubernetes custom resources
- HelmRelease, HelmChart, and HelmRepository resources
- kubectl and Flux CLI

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux HelmRelease guide, Configure notifications: https://fluxcd.io/flux/guides/helmreleases/#configure-notifications
- Flux CLI reference for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux HelmRelease documentation, events and status conditions: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The combined Helm workflow alert described monitoring only `HelmRelease` and `HelmRepository` events as "complete Helm workflow visibility". Flux's official Helm notification example includes `HelmChart` alongside `HelmRelease` and `HelmRepository`, because chart artifact events are part of the Helm release workflow. I updated the section heading, explanatory sentence, YAML comment, and manifest to include a wildcard `HelmChart` event source.

## Review Notes
The Alert API version `notification.toolkit.fluxcd.io/v1beta3`, `eventSources`, wildcard names, `eventSeverity`, `exclusionList`, and `flux reconcile helmrelease --with-source` usage are current and match the official Flux documentation as of 2026-05-15.
