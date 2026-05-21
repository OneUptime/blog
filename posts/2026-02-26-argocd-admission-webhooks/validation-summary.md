# Validation Summary: How to Handle ArgoCD with Kubernetes Admission Webhooks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes admission webhooks
- Kubernetes server-side apply and dry-run
- Istio sidecar injection
- HashiCorp Vault Agent Injector
- Kyverno
- OPA Gatekeeper

## Sources Consulted
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Server-Side Apply: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kyverno Applying Policies: https://kyverno.io/docs/applying-policies/
- Kyverno Policy Reports: https://kyverno.io/docs/guides/reports/

## Issues Found
- The Istio sidecar injection example implied automatic injection mutates Deployment objects. Istio documents that automatic injection happens at pod creation time and does not change the Deployment itself, so the example was narrowed to directly managed Pod manifests and the Argo CD ignore paths were changed from Deployment template paths to Pod paths.
- The dry-run section described `SkipDryRunOnMissingResource=true` as a general fix for webhook dry-run failures and paired it with server-side apply. Argo CD documents this option specifically for missing custom resource types, so the section now limits that recommendation to missing CRDs and tells readers to fix webhook availability or failure policy for webhook service failures.
- The Kyverno example used `policies.kyverno.io/last-applied-patches` as a label path. This is an annotation, so the ignore path was corrected to `metadata.annotations`.
- The webhook configuration snippets looked like complete `admissionregistration.k8s.io/v1` resources but omitted required fields such as `clientConfig`, `rules`, `admissionReviewVersions`, and `sideEffects`. Comments were added to clarify that the snippets show only the relevant fields.
- The server-side apply section recommended `Force=true` for field ownership conflicts. Argo CD documents `Force=true` as delete/create sync behavior for resources that need recreation, while `ServerSideApply=true` already uses server-side apply with conflict handling. The destructive `Force=true` recommendation was removed and replaced with a warning.
- The webhook outage section said every resource creation goes through the webhook. This was corrected to resources matching the webhook rules.
- The kubectl debugging note overstated `-v=6` as showing the full API request and response. It now states that `--dry-run=server` runs admission without persistence and `-v=6` increases request logging for inspection.

## Review Notes
The post is technically relevant and useful after correction. Several YAML examples remain intentionally partial, but the required omitted fields are now called out where the snippet might otherwise be mistaken for a complete Kubernetes resource.
