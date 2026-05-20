# Validation Summary: How to Link Resources to External Management Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD external URL links and deep links
- Kubernetes annotations and manifests
- Kustomize annotation transformers
- kubectl and jq
- Terraform Cloud, Grafana, Datadog, OneUptime, Jira, GitHub Actions, GitLab CI, Jenkins, AWS Console, and Google Cloud Console links

## Sources Consulted
- Argo CD External URL Links: https://argo-cd.readthedocs.io/en/stable/user-guide/external-url/
- Argo CD Deep Links: https://argo-cd.readthedocs.io/en/release-2.8/operator-manual/deep_links/
- Argo CD Annotations and Labels: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Kustomize built-in AnnotationsTransformer reference: https://kubectl.docs.kubernetes.io/references/kustomize/builtins/#_annotationstransformer_
- kubectl resource output conventions: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post used `argocd.argoproj.io/managed-by` as a URL annotation for arbitrary resources. Argo CD documents `link.argocd.argoproj.io/{some link name}` for adding external resource links in the UI; `argocd.argoproj.io/managed-by-url` is a separate Application-specific annotation for linking to another Argo CD instance, and `argocd.argoproj.io/managed-by` is not the documented resource URL-link mechanism. Updated examples to use `link.argocd.argoproj.io/...` annotations.
- The post described `resource.customizations.externalURLs` with `condition` fields and top-level `{{.Name}}` / `{{.Namespace}}` templates. Official Argo CD deep links use `<location>.links`, including `resource.links`, with `if` conditions and template data such as `{{.resource.metadata.name}}` and `{{.resource.metadata.namespace}}`. Updated the config snippets accordingly.
- The deep-link examples used `icon` instead of the documented `icon.class` field. Updated those examples to use Font Awesome class names.
- The application-level deep-link examples used `{{.metadata.name}}`; official deep-link templates expose application data under `application`. Updated them to `{{.application.metadata.name}}`.
- The verification command checked only `argocd.argoproj.io/managed-by` and used `kubectl get all`, which does not cover every resource type discussed in the article. Updated it to scan `link.argocd.argoproj.io/` annotations and include Ingresses and PVCs in the example resource list.

## Review Notes
The external service URLs are illustrative and generally plausible, but readers will still need to adapt them to their actual organization, project, region, workspace, dashboard, and service names. The Kubernetes resource snippets are intentionally focused on metadata and annotations rather than complete apply-ready workload manifests.
