# Validation Summary: How to Use Label-Based Resource Tracking in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes labels and label selectors
- kubectl
- Helm charts
- Kustomize

## Sources Consulted
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd-cm` configuration reference: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/argocd-cm-yaml/
- Kubernetes Recommended Labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Helm Chart Best Practices for labels and annotations: https://helm.sh/docs/chart_best_practices/labels/

## Issues Found
- The post described label-based tracking as the default. Current Argo CD documentation lists `annotation` as the default tracking method, so the introduction and configuration section were updated to say that `label` must be configured explicitly in current releases.
- The conflict diagnosis command used `argocd app manifests my-app --source live -o json`, but the official command reference does not list `-o`/`--output` for `argocd app manifests`. The example was changed to pipe the generated Git manifests to `yq`.
- The Helm conflict explanation said the resource may be perpetually `OutOfSync` specifically because Git and live labels differ. That is too broad for Argo CD-managed tracking labels, so it was changed to describe mis-association or drift when another tool later changes the live label.
- The multiple-application section said annotation tracking handles shared resources better because the tracking ID includes the full resource path. This was clarified: annotation tracking reduces ambiguity, but it still does not make two Argo CD Applications safely own the same live resource.

## Review Notes
The remaining examples are valid for label-based tracking when `application.resourceTrackingMethod: label` is configured. `kubectl get all` does not include every Kubernetes resource kind, so future revisions could mention that users may need to query additional resource types explicitly.
