# Validation Summary: How to Configure Tenant-Specific Notification Channels in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets
- kubectl
- Flux CLI
- Slack, Microsoft Teams, PagerDuty, and generic webhook notification providers

## Sources Consulted
- Flux Notification Controller documentation: https://fluxcd.io/flux/components/notification/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post used `apiVersion: notification.toolkit.fluxcd.io/v1` for Provider and Alert resources. Current Flux documentation shows `v1` only for Receiver resources, while Provider and Alert use `notification.toolkit.fluxcd.io/v1beta3`. Updated all Provider and Alert manifests to `v1beta3`.
- The Slack examples used an incoming webhook URL in the Secret while also setting `.spec.channel`. Flux's current recommended Slack configuration uses `address: https://slack.com/api/chat.postMessage` with a Secret containing a `token` key. Updated the Slack Provider examples and the `kubectl create secret` command accordingly.
- The PagerDuty example used a generic webhook provider pointed at the Events API enqueue path. Flux has a dedicated `pagerduty` provider type that formats Event API v2 payloads, with `address: https://events.pagerduty.com` and `channel` set to the integration/routing key. Updated the PagerDuty Provider snippet.
- The generic webhook example placed `headers` under `Provider.spec`, but Flux expects custom HTTP headers in the referenced Secret under the `headers` key. Moved the headers into a Secret manifest.
- The Microsoft Teams example referenced a Secret without showing the required webhook address in that Secret. Added a Secret manifest with the `address` key, matching the Flux provider documentation.
- The routing wording implied `eventSeverity: info` means info-only events. Flux documents that `info` forwards all events, while `error` filters to errors. Adjusted the wording and comment to avoid implying info-only routing.
- The multi-tenancy wording implied namespace-scoped Alerts alone prevent tenants from seeing other tenants' events. Flux allows event sources to specify namespaces unless cross-namespace references are disabled. Updated the explanation to mention multi-tenancy lockdown and event source namespace defaults.

## Review Notes
The validation environment did not have local `flux` or `kubectl` binaries installed, so CLI syntax was checked against official Flux and Kubernetes command references rather than local `--help` output.
