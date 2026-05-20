# Validation Summary: How to Handle CRD Conversion Webhooks with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync waves, hooks, resource health, and diff customization
- Kubernetes CustomResourceDefinition conversion webhooks
- Kubernetes ConversionReview API
- cert-manager Certificate resources and CA injection
- kube-webhook-certgen certificate generation
- Kubernetes PodDisruptionBudget
- Go HTTP webhook handling

## Sources Consulted
- Kubernetes documentation: Versions in CustomResourceDefinitions: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes documentation: Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Argo CD documentation: Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD documentation: Diff Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD documentation: Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- cert-manager documentation: CA Injector: https://cert-manager.io/docs/concepts/ca-injector/
- kube-webhook-certgen documentation: https://github.com/kubeshop/kube-webhook-certgen

## Issues Found
- The fallback kube-webhook-certgen job used default output keys, which are `cert` and `key`. Added `--cert-name=tls.crt` and `--key-name=tls.key` so the generated Secret matches the TLS-style key names used by cert-manager and commonly expected by webhook servers.
- The custom Argo CD Deployment health check selected Deployments by `metadata.labels["app"]`, but the example Deployment only had the label on the Pod template. Added the same label to the Deployment metadata.
- The custom health check overrode Argo CD's built-in Deployment health for all Deployments and returned an empty health object for non-webhook Deployments. Updated the text and Lua example so non-webhook Deployments still return a valid health status.
- The failure handling list said to set `failurePolicy` on the CRD, then correctly stated that CRD conversion has no `failurePolicy`. Changed the list item to say not to rely on `failurePolicy`.
- The sync wave summary included a standalone wait wave. Removed it because Argo CD sync waves apply resources and hooks; waiting happens because Argo CD does not proceed until earlier waves are in sync and healthy.

## Review Notes
- The CRD conversion webhook schema, `conversionReviewVersions`, `clientConfig.service`, `caBundle`, and cert-manager `cert-manager.io/inject-ca-from` usage align with current Kubernetes and cert-manager documentation.
- The `ignoreDifferences` JSON pointer for `spec.conversion.webhook.clientConfig.caBundle` matches Argo CD's documented application-level diff customization format.
- The Go handler is a structural example rather than a complete compilable program because imports and the `convert` function are intentionally omitted.
