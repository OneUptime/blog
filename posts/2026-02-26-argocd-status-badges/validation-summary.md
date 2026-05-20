# Validation Summary: How to Use Status Badges for ArgoCD Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD status badges
- Argo CD ConfigMap settings
- Argo CD API
- Argo CD CLI
- Kubernetes ConfigMaps
- Markdown and HTML image embedding

## Sources Consulted
- Argo CD Status Badge documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/status-badge/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD badge handler source: https://github.com/argoproj/argo-cd/blob/master/server/badge/badge.go
- Go package documentation for Argo CD badge handler: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/server/badge

## Issues Found
- The post said badges are SVG or PNG images. Argo CD's badge handler serves SVG with `Content-Type: image/svg+xml`, so the post now says SVG images.
- The post described separate sync and health badges. Argo CD provides a single badge containing both health and sync status, so the explanation and diagram were corrected.
- The health status list omitted Suspended and Unknown. The list now includes those status values.
- The post said badge endpoints are available by default but may require authentication. Official documentation says the feature is disabled by default because enabled badge images are available without authentication, so the enabling section was corrected.
- The token-based badge access section implied API tokens can be passed in badge URLs. That is not a documented or supported badge mechanism, so it was replaced with `statusbadge.url` guidance and proxy-based authentication guidance.
- The available badge parameters were incomplete. The post now includes `showAppName`, `keepFullRevision`, and `width` alongside the existing `name`, `project`, and `revision` parameters.
- The caching section did not mention Argo CD's `Cache-Control: private, no-store` response. That was added while retaining downstream cache caveats.
- Troubleshooting claimed disabled badges return 404 and missing authentication returns 403. The current handler behavior and documentation do not support that guidance, so those entries were replaced with Unknown-status and 400-parameter guidance.
- The security section still referenced token-based badge access. It now refers to rotating proxy credentials if a proxy is used.

## Review Notes
The local `argocd` CLI was not installed in the review environment, so CLI syntax was checked against official Argo CD command reference documentation rather than local `--help` output. The project-level badge parameter is supported by the current badge handler source, although it is not listed in the public Status Badge documentation page.
