# Validation Summary: How to Filter Flux Alerts by Source Kind

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Flux Alert and Provider resources
- Kubernetes custom resources
- Flux CLI
- kubectl

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux monitoring alerts guide: https://fluxcd.io/flux/monitoring/alerts/
- Flux CLI reference for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/

## Issues Found
- The Alert examples used `apiVersion: notification.toolkit.fluxcd.io/v1`, but Flux's current notification API reference documents `Alert` under `notification.toolkit.fluxcd.io/v1beta3`; `v1` currently documents `Receiver`. Updated all Alert snippets to `notification.toolkit.fluxcd.io/v1beta3`.
- The prerequisites claimed Flux CD v2.0 or later, which was too broad for the corrected `v1beta3` Alert examples. Updated the prerequisite to require Flux with the `notification.toolkit.fluxcd.io/v1beta3` Alert API installed.
- The resource-kind list was worded as exhaustive, but Alert event sources can reference Flux objects by kind/name/namespace and Flux has additional source/image automation kinds beyond the table. Reworded it as a list of common resource kinds.
- The verification note said only the GitRepository alert should fire after `flux reconcile source git flux-system`. Updated it to clarify that matching namespace and severity are also required.

## Review Notes
The Flux CLI command syntax `flux reconcile source git [name]` is correct, and `flux-system` is a plausible GitRepository name for bootstrap-style installations. The post's examples assume the referenced Provider resources already exist in the same namespace as the Alerts.
