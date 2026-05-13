# Validation Summary: How to Configure Flux Receiver for Multiple Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller Receiver API
- Kubernetes custom resources
- GitHub webhooks
- Flux CLI
- kubectl

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux notification-controller options: https://fluxcd.io/flux/components/notification/options/
- Flux CLI `flux get all` reference: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/

## Issues Found
- The post stated that each Receiver gets its own token and needs its own secret. Flux requires each Receiver to have a `secretRef` pointing to a Secret with a `token` key, but multiple Receivers can reference the same Secret or use the same token value. Updated the wording to reflect this.
- The cross-namespace troubleshooting note implied that Receivers can only target resources in their own namespace by default. Flux uses the Receiver namespace only when `namespace` is omitted from a resource reference, and cross-namespace references are allowed unless disabled with `--no-cross-namespace-refs=true`. Updated the note accordingly.

## Review Notes
The Receiver API examples use current Flux API versions and valid fields, including `spec.resources`, `matchLabels` with `name: "*"`, `secretRef`, `events`, and `.status.webhookPath`. The `flux get all --all-namespaces -w` command is valid, but the official Flux documentation marks `flux get all` as preview and subject to change.
