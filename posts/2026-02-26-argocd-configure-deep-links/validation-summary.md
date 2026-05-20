# Validation Summary: How to Configure Deep Links in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD deep links
- Kubernetes ConfigMaps
- Go `text/template`
- Sprig template functions
- `expr-lang/expr` conditions
- `kubectl`
- Grafana, Loki, Kibana, GitHub Actions, Jira, Confluence, OneUptime example URLs

## Sources Consulted
- Argo CD Deep Links documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/deep_links/
- Argo CD `argocd-cm.yaml` reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD v3.4.1 deep links implementation: https://github.com/argoproj/argo-cd/blob/v3.4.1/server/deeplinks/deeplinks.go
- Argo CD v3.4.1 application deep links usage: https://github.com/argoproj/argo-cd/blob/v3.4.1/server/application/application.go
- Argo CD v3.4.1 project deep links usage: https://github.com/argoproj/argo-cd/blob/v3.4.1/server/project/project.go
- Go `text/template` package documentation: https://pkg.go.dev/text/template
- Sprig string function documentation: https://masterminds.github.io/sprig/strings.html

## Issues Found
- The post said the `if` field uses CEL. Argo CD uses `expr-lang/expr` for deep-link conditions, so the explanation was corrected.
- The examples used unqualified template and condition fields such as `{{.metadata.name}}`, `{{.spec.source.repoURL}}`, and `kind == "Pod"`. Current Argo CD builds a deep-link object with keys such as `.resource`, `.app`/`.application`, `.cluster`, and `.project`, so examples and variable lists were updated to use those contexts.
- The GitHub source-link example used `call .regex`, but Argo CD provides Go `text/template` with Sprig functions, not a `.regex` object in the template context. The example was changed to use supported Sprig functions, including `trimSuffix` and `replace`.
- One example URL began directly with a Go template expression, which can be invalid YAML as an unquoted scalar. The URL was quoted.
- The complete example included `exec.enabled: "true"`, which enables the Argo CD web terminal and is unrelated to deep links. It was removed to avoid implying it is required for deep-link configuration.

## Review Notes
Argo CD's current deep-link documentation and generated `argocd-cm.yaml` reference show slightly different examples for template context. The latest server implementation and deep-link operator manual support the grouped context keys used in the corrected post.
