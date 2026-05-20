# Validation Summary: How to Customize Managed By URL Display in UI

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD deep links
- Kubernetes ConfigMaps
- kubectl
- Go text/template
- expr expression language

## Sources Consulted
- Argo CD Deep Links documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/deep_links/
- Argo CD Managed By URL Annotation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/managed-by-url/
- expr language definition: https://expr-lang.org/docs/Language-Definition
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl command reference for rollout restart: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post used `argocd.argoproj.io/managed-by` and described it as a raw URL link on resources. Updated this to the documented `argocd.argoproj.io/managed-by-url` annotation and clarified that it controls Application links in multi-instance Argo CD setups, while deep links are the feature for custom external links.
- Resource deep-link templates used unsupported shorthand variables such as `{{.Name}}`, `{{.Namespace}}`, and `{{.Kind}}`. Updated examples to use the documented resource context, such as `{{.resource.metadata.name}}`, `{{.resource.metadata.namespace}}`, and `{{.resource.kind}}`.
- Conditional expressions used unavailable bare identifiers such as `kind`, `namespace`, and `group`. Updated conditions to use expr syntax against the documented `resource` and `app` objects.
- Application-level examples used `{{.metadata.name}}` and `{{.spec.source.repoURL}}` directly. Updated them to use the documented application context, such as `{{.app.metadata.name}}` and `{{.app.spec.source.repoURL}}`.
- Icon examples used `icon`, but Argo CD documents the field as `icon.class` with Font Awesome classes. Updated all examples and the property list accordingly.
- Verified the edited YAML snippets parse successfully.

## Review Notes
The post is now accurate for Argo CD's current deep-link configuration model. The example URLs use placeholder internal domains and should be replaced with real organization-specific destinations before use.
