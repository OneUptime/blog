# Validation Summary: How to Create Deep Links to Documentation from ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD deep links
- Kubernetes ConfigMaps and annotations
- Go text/template and Sprig template functions
- expr conditional expressions
- Confluence, Notion, GitHub Wiki, Swagger/OpenAPI, PagerDuty, and OneUptime documentation links

## Sources Consulted
- Argo CD Deep Links documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/deep_links/
- Argo CD argocd-cm.yaml example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm-yaml/
- Argo CD v2.6 to v2.7 upgrade notes for deep-link template updates: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.6-2.7/
- Argo CD deeplinks source implementation: https://raw.githubusercontent.com/argoproj/argo-cd/master/server/deeplinks/deeplinks.go
- Kubernetes annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Atlassian Confluence URL documentation: https://support.atlassian.com/confluence/kb/confluence-url-list/
- Notion search documentation: https://www.notion.com/help/search

## Issues Found
- Updated Argo CD deep-link template references to use the current named objects such as `.app.metadata.name`, `.resource.metadata.name`, and `.project.metadata.name`. Current Argo CD deep-link documentation exposes link data through named objects rather than relying on unqualified `.metadata` or `.spec` fields.
- Replaced invalid dotted annotation access such as `{{.metadata.annotations.docs/runbook}}` and `metadata.annotations.docs/runbook != nil` with documented map access, for example `{{ index .resource.metadata.annotations "docs/runbook" }}` and `resource.metadata.annotations["docs/runbook"] != nil`. Kubernetes annotation keys commonly contain `/`, which cannot be addressed as dotted template fields.
- Single-quoted template URLs that start with `{{` or contain `index ... "docs/..."` so the embedded `application.links` and `resource.links` YAML remains valid.
- Changed a templated deep-link title to a static title because the Argo CD implementation evaluates URL templates and conditions, while titles are passed through as configured.
- Clarified the Confluence URL explanation to mention space keys, page titles, and page IDs, matching the URL forms shown in the examples.

## Review Notes
The snippets are written for current Argo CD deep-link behavior. Application examples assume a single-source Argo CD Application using `spec.source`; multi-source Applications using `spec.sources` would need adjusted repository-link templates.
