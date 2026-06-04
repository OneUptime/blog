# Validation Summary: How to Use Crossplane Claims for Self-Service Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Crossplane
- Crossplane CompositeResourceDefinitions, Compositions, composite resources, and claims
- Kubernetes ResourceQuota
- Kubernetes ValidatingWebhookConfiguration
- Argo CD / Flux GitOps workflows
- External Secrets Operator

## Sources Consulted
- Crossplane v2.3 documentation: What's New in v2 - https://docs.crossplane.io/latest/whats-new/
- Crossplane v2.3 documentation: Upgrade to Crossplane v2 - https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- Crossplane v1.20 documentation: Claims - https://docs.crossplane.io/v1.20/concepts/claims/
- Crossplane v1.20 documentation: Composite Resource Definitions - https://docs.crossplane.io/v1.20/concepts/composite-resource-definitions/
- Crossplane v2.3 documentation: Composite Resources - https://docs.crossplane.io/latest/composition/composite-resources/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes API reference: ValidatingWebhookConfiguration v1 - https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- External Secrets Operator documentation: PushSecret - https://external-secrets.io/v0.20.2/guides/pushsecrets/

## Issues Found
- The post presented claims as the current Crossplane self-service model without a version caveat. Crossplane v2 uses namespaced composite resources for new APIs and does not support claims for new v2 XRDs. Added a note that the post applies to Crossplane v1-style APIs and legacy v1 XRDs in Crossplane v2.
- The Deployment example was invalid for `apps/v1` because it omitted `spec.selector` and matching pod template labels. Added a selector and labels.
- The deletion command said deleting a claim also deletes infrastructure. Clarified that claim deletion deletes the associated composite resource, while external resource deletion depends on the composed managed resources' deletion policies.
- The GitOps section implied sync ordering alone guarantees readiness. Updated the text to mention sync ordering and health checks.
- The `ValidatingWebhookConfiguration` example omitted required `admissionReviewVersions` and `sideEffects` fields for the `admissionregistration.k8s.io/v1` API. Added both fields.
- The External Secrets Operator example used `ExternalSecret`, which pulls from an external provider into Kubernetes, while the text described pushing Crossplane-generated Kubernetes secrets to an external store. Replaced it with a `PushSecret` example.
- The custom status conditions section implied Compositions create arbitrary claim conditions. Crossplane publishes standard `Synced` and `Ready` conditions. Updated the section to read the `Ready` condition and describe standard conditions.
- The cleanup policy example used `deletionPolicy: Delete` on a claim. Crossplane claims use `compositeDeletePolicy` with `Background` or `Foreground`; `Delete` and `Orphan` are managed resource deletion policies. Updated the example and explanation.

## Review Notes
The example claim kinds and parameter fields are illustrative and depend on the XRD schema defined by the platform team. For new Crossplane v2 designs, a future post should use namespaced composite resources instead of claims.
