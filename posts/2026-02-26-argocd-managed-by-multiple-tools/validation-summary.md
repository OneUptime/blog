# Validation Summary: How to Use Managed By Annotation with Multiple Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes annotations and labels
- Argo CD deep links
- kubectl
- jq
- GitOps tooling integrations

## Sources Consulted
- Argo CD Deep Links documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/deep_links/
- Argo CD Managed By URL Annotation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/managed-by-url/
- Argo CD External URL Links documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/external-url/
- Argo CD Annotations and Labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Kubernetes Annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post referred to `argocd.argoproj.io/managed-by` as a URL annotation for Kubernetes resources. Argo CD documents `argocd.argoproj.io/managed-by-url` for Application resources and `link.argocd.argoproj.io/{link name}` for per-resource external links. Updated the resource examples and audit script to use `link.argocd.argoproj.io/source-code`.
- The deep link examples used unsupported shorthand template variables such as `{{.Name}}` and `{{.Namespace}}`. Argo CD resource deep links expose the Kubernetes object through `resource`, so these were changed to `{{.resource.metadata.name}}` and `{{.resource.metadata.namespace}}`.
- The conditional expressions used shorthand fields such as `kind`, `namespace`, `labels`, and `annotations`. Updated them to valid Argo CD deep link expressions such as `resource.kind`, `resource.metadata.namespace`, `resource.metadata.labels[...]`, and `resource.metadata.annotations[...]`.
- The examples used `icon`, but Argo CD deep links document `icon.class` for Font Awesome classes. Updated the examples to use `icon.class` values such as `fa-github`, `fa-cloud`, and `fa-book`.

## Review Notes
The central registry ConfigMap is a valid Kubernetes object, but the post does not wire it into Argo CD deep links directly. It should be treated as an organizational registry pattern unless a future version adds automation that reads it and generates `argocd-cm` link configuration.
