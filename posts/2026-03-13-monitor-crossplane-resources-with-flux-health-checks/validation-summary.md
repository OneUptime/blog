# Validation Summary: How to Monitor Crossplane Resources with Flux Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization health checks
- Flux notification-controller Providers and Alerts
- Flux CLI
- Crossplane managed resources
- Crossplane composite resources and claims
- Upbound AWS providers for RDS and S3
- Kubernetes conditions and events

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux get alert-providers`: https://fluxcd.io/flux/cmd/flux_get_alert-providers/
- Flux CLI `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux events`: https://fluxcd.io/flux/cmd/flux_events/
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane composite resources documentation: https://docs.crossplane.io/latest/composition/composite-resources/
- Upbound provider-aws-rds Instance resource: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/latest
- Upbound provider-aws-s3 Bucket resource: https://marketplace.upbound.io/providers/upbound/provider-aws-s3/latest

## Issues Found
- The Flux `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but the current Flux notification v1 API only documents `Receiver`; `Provider` and `Alert` are in `notification.toolkit.fluxcd.io/v1beta3`. Updated all Provider and Alert manifests to `v1beta3`.
- The post used `eventSeverity: warning` and said to alert on warning events. Flux alert severities are `info` and `error`; `info` forwards all events, while `error` filters to errors. Updated the provider-health alert to `eventSeverity: error` and revised the best-practice guidance.
- The examples used older Upbound AWS provider API groups such as `rds.aws.upbound.io` and `s3.aws.upbound.io` for managed resources. Updated the examples to current Crossplane v2 / Upbound v2-style namespaced groups, `rds.aws.m.upbound.io` and `s3.aws.m.upbound.io`, and added an example namespace.
- The `flux get kustomization databases --verbose` command used the singular command name. Updated it to the documented `flux get kustomizations databases --verbose`.
- The event-inspection example used a broad `kubectl get events` field selector while describing a specific Kustomization. Updated it to the documented `flux events --for Kustomization/databases`.
- The manual alert test suggested pausing a Crossplane managed resource with `crossplane.io/paused=true`, which affects reconciliation and may not make Flux's default health check fail if `Ready` remains true. Replaced it with a safer instruction to force reconciliation after intentionally introducing a test failure in Git.
- The Step 6 heading referred to Kustomize post-build, but the example used standard Flux `healthChecks`, not post-build substitution or patches. Renamed the heading to match the actual configuration shown.
- The best-practice note about monitoring `Synced` implied default Flux health checks require both `Ready` and `Synced`. Clarified that default health checks use kstatus-style readiness and that CEL `healthCheckExprs` should be added if `Synced=True` must be part of the gate.

## Review Notes
The Slack incoming webhook example is valid as Flux's documented legacy Slack mode, but the current Flux docs also recommend Slack bot tokens with `https://slack.com/api/chat.postMessage` for newer setups. The post intentionally keeps the webhook form because the prerequisites mention a Slack webhook.
