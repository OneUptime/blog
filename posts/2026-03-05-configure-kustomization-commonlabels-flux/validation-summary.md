# Validation Summary: How to Configure Kustomization CommonLabels in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resource
- Kustomize
- Kubernetes labels and selectors
- Kubernetes Deployments, Services, and Jobs
- kubectl

## Sources Consulted
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize v4.1.0 release notes for the `labels` field: https://github.com/kubernetes-sigs/kustomize/releases/tag/kustomize/v4.1.0
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Deployment documentation for selector requirements and immutability: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kustomize v5.8.1 build output from the official release binary: https://github.com/kubernetes-sigs/kustomize/releases

## Issues Found
- The post stated that `commonLabels` adds labels to the `spec.selector.matchLabels` field of Jobs without qualification. Kustomize adds labels to a Job selector when the Job defines an explicit selector, but it does not create `spec.selector.matchLabels` for a normal Job that omits the selector. Updated the explanation to make this conditional.
- The selector behavior list did not mention Service `spec.selector`, even though the article later relies on it. Updated the explanation to include Service selectors.
- The expected Deployment output showed `app: webapp` under Deployment `metadata.labels`, but the base Deployment did not define that metadata label and `commonLabels` would not create it. Removed that line from the expected output.
- The Flux examples used `targetNamespace: staging` and `targetNamespace: production` without noting that those namespaces must exist. Added a short assumption statement before the Flux Kustomization manifests.

## Review Notes
The post is technically valid after the corrections. Kustomize v5.8.1 still supports `commonLabels` but emits a deprecation warning recommending `labels`. The `labels` transformer was introduced in Kustomize v4.1.0 and defaults `includeSelectors` to false. Flux post-build substitution happens after `kustomize build`, so the `${APP_VERSION}` example is valid when Flux performs the final substitution.
