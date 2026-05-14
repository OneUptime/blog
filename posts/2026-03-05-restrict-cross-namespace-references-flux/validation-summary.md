# Validation Summary: How to Restrict Cross-Namespace References in Flux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm Controller
- Notification Controller
- Kubernetes RBAC and namespace isolation

## Sources Consulted
- Flux multi-tenancy configuration: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux security documentation, cross-namespace reference policy: https://fluxcd.io/flux/security/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux security best practices: https://fluxcd.io/flux/security/best-practices/

## Issues Found
- The introduction incorrectly implied that Flux generally allows cross-namespace Secret references by default. Flux documentation describes cross-namespace policy for sources and events, while Secret and ConfigMap references such as Helm `valuesFrom` and Kustomization decryption secrets are same-namespace references. Updated the wording to focus on sources and event sources.
- The risk list said tenants could reference another namespace's Secret for decryption keys. Kustomization decryption uses a name-only `secretRef` expected in the Kustomization namespace, so this was replaced with subscribing to events from another namespace.
- The Kustomization examples omitted `spec.prune`, which is a required field in the Flux Kustomization API. Added `prune: true` to both examples.
- The "What Gets Restricted" section attributed same-namespace Secret/ConfigMap behavior to `--no-cross-namespace-refs`. Updated it so kustomize-controller covers `spec.sourceRef`, helm-controller covers chart source references, and notification-controller covers Alert event sources and Receiver resources.

## Review Notes
The controller patch list matches Flux's documented multi-tenancy lockdown and security best-practice guidance for `helm-controller`, `kustomize-controller`, `notification-controller`, `image-reflector-controller`, and `image-automation-controller`. Future updates could mention Flux's additional hardening flags such as `--no-remote-bases=true` and `--default-service-account`, but those are outside the narrow topic of this post.
