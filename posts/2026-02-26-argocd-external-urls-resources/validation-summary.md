# Validation Summary: How to Add External URLs to Application Resources in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD external URL links
- Argo CD deep links
- Kubernetes annotations and manifests
- Kustomize overlays and patches
- Helm templates and values
- kubectl JSONPath output
- yq-based YAML updates in CI/CD

## Sources Consulted
- Argo CD External URL Links: https://argo-cd.readthedocs.io/en/stable/user-guide/external-url/
- Argo CD Annotations and Labels: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD Deep Links: https://argo-cd.readthedocs.io/en/latest/operator-manual/deep_links/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Helm chart template documentation: https://helm.sh/docs/topics/charts/

## Issues Found
- The post described `link.argocd.argoproj.io/external-link` as the single exact external URL annotation and stated that external URLs support only one link per resource. Argo CD documents the annotation format as `link.argocd.argoproj.io/{some link name}`, which allows multiple link annotations on the same resource. Updated the explanatory wording, comparison table, troubleshooting note, flowchart label, and conclusion to reflect the broader annotation prefix while keeping `external-link` as the tutorial's example suffix.

## Review Notes
- The Kustomize and Helm snippets are valid patterns for adding the annotation shown in the tutorial.
- The kubectl JSONPath example uses the documented escaping style for dotted annotation keys.
- Some Kubernetes snippets are intentionally abbreviated to focus on annotations rather than complete apply-ready manifests.
