# Validation Summary: How to Troubleshoot Flux CD by Checking Kubernetes Events

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes Events
- kubectl
- jq
- Flux Notification Controller
- Slack webhook notifications
- kube-apiserver event retention

## Sources Consulted
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Flux Events documentation: https://fluxcd.io/flux/monitoring/events/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The Flux Notification Controller example used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3`, so the manifest was updated to that API version.
- The Slack legacy incoming webhook example included `spec.channel`. Flux documentation shows legacy Slack webhook configuration using a secret `address` and no `channel` field, because the webhook URL determines the target channel. The `channel` field was removed.
- The Alert comment said it monitored all Flux resource types, but Flux Alert event sources default to the Alert namespace when `namespace` is omitted. The comment was narrowed to say it monitors Flux resource types in the `flux-system` namespace.

## Review Notes
- The Kubernetes event field selectors used in the post are supported for Event resources, including `type`, `reason`, `source`, and `involvedObject.*`.
- Kubernetes kube-apiserver still documents `--event-ttl` with a default of `1h0m0s`.
- Flux documentation recommends `kubectl events` and `flux events` for some workflows, but the `kubectl get events` examples in the post remain technically valid.
