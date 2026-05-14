# Validation Summary: How to Create Audit Trail for All Deployments with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux CD Kustomization and reconciliation events
- Kubernetes Events and kubectl
- GitOps deployment audit trails
- GitHub API enrichment
- Elasticsearch query DSL
- Bash scripting

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux events CLI documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- GitHub REST API documentation for commits and pull requests: https://docs.github.com/en/rest/commits and https://docs.github.com/en/rest/pulls

## Issues Found
- The Flux `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux Alert and Provider resources are documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated both snippets to `v1beta3`.
- The Flux `Alert.spec.eventSources` entries omitted the required `name` field. Added `name: '*'` to select all resources of each kind.
- The Alert examples used `.spec.summary`, which the current Flux docs mark as deprecated in favor of `.spec.eventMetadata.summary`. Updated both Alert snippets to use `eventMetadata.summary`.
- The post described the generic webhook payload as containing `lastTimestamp`; Flux notification events use `timestamp`, while Kubernetes Event listings may expose timestamp fields separately. Updated the webhook field list and Elasticsearch query to use `timestamp`.
- The post said the commit SHA should be extracted from the event message. Flux notification events carry source revision data in event metadata, so the enrichment description now extracts the SHA from metadata.
- The Kubernetes event command was described as showing the past 24 hours, but the command does not apply a 24-hour filter and Kubernetes events commonly expire based on API server event TTL. Updated the wording to "retained" or "recent retained" events.
- The tamper detection section overstated `prune: true` as removing arbitrary unauthorized resources. Updated the explanation to clarify that Flux corrects drift for managed resources and prunes previously managed resources missing from the current source revision, but does not delete arbitrary unmanaged objects.
- The Mermaid diagram implied Flux events provide the actor identity. Updated it to show Flux events provide what/when/outcome/revision, while Git and PR records provide identity and authorization context.

## Review Notes
The local environment did not have `kubectl` or `flux` installed, so CLI behavior was checked against official generated command documentation rather than local help output. Flux notification events are rate limited by notification-controller by default; a production audit pipeline should account for that if it relies on Alert webhooks as the only event export path.
