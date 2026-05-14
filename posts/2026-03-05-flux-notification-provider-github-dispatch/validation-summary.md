# Validation Summary: How to Configure Flux Notification Provider for GitHub Dispatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets and kubectl
- GitHub repository dispatch API
- GitHub Actions workflows
- Flux CLI reconciliation

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- GitHub Actions `repository_dispatch` documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch
- GitHub REST API "Create a repository dispatch event" documentation: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event

## Issues Found
- The Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for Provider and Alert resources. Updated all Provider and Alert snippets to `v1beta3`.
- The GitHub Actions workflow used wildcard `repository_dispatch.types` values such as `Kustomization/*` and `HelmRelease/*`. GitHub `types` values must exactly match the repository dispatch `event_type`, and Flux generates event types in the `{Kind}/{Name}.{Namespace}` format. Updated the workflow to listen for all repository dispatch events and filter by Flux resource kind at the job level.
- The post said the Flux event type was derived from kind and name only. Updated the explanation to include namespace and the exact `{Kind}/{Name}.{Namespace}` format from Flux documentation.
- The Alert comment said `eventSeverity: info` triggered successful reconciliations. Flux documents `info` as forwarding all events, including errors. Updated the comment to say it triggers informational and error events.
- The token guidance only mentioned classic PAT `repo` scope. GitHub REST documentation also supports fine-grained tokens with write access to repository contents. Updated the prerequisites, token creation step, and troubleshooting note.

## Review Notes
The `flux reconcile kustomization flux-system --with-source` command and `kubectl create secret generic ... --from-literal=token=...` usage are consistent with the official CLI and Kubernetes patterns. The `flux` CLI was not installed in the local environment, so the Flux command was verified against official documentation rather than local `--help` output.
