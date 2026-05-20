# Validation Summary: How to Use Notification Template Functions in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD notifications
- Go templates / `html/template`
- Sprig template functions
- Kubernetes `kubectl logs`
- GitHub commit status webhooks

## Sources Consulted
- Argo CD notification templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification functions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/functions/
- Argo CD notification webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Sprig function documentation: https://masterminds.github.io/sprig/
- Go `html/template` package documentation: https://pkg.go.dev/html/template
- Go `time.Time` package documentation: https://pkg.go.dev/time#Time.UnixMilli
- Kubernetes `kubectl logs` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- GitHub REST API commit statuses documentation: https://docs.github.com/en/rest/commits/statuses

## Issues Found
- The post said Argo CD notification templates inherit Go `text/template` functions. Argo CD documentation states notification templates use Go `html/template`, so I changed the wording while preserving the broader point about built-in template functions.
- The description mentioned custom functions, but the post does not explain creating custom functions and Argo CD notification template customization is configuration-driven. I changed this to JSON helpers.
- The post claimed the guide documented every function category. Official Argo CD docs include additional functions such as `.sync.GetInfoItem`, `.repo.QueryEscape`, `.repo.GetCommitMetadata`, and `.repo.GetAppDetails`, so I changed the wording to "common function categories."
- The `RepoURLToHTTPS` example showed the `.git` suffix being removed. Argo CD's implementation converts the URL scheme but does not strip `.git`, so I corrected the output and added `trimSuffix ".git"` when building browser-facing commit and compare links.
- The `toUnixMilli` example used a function that is not documented by Sprig or Argo CD. I replaced it with parsing through Argo CD's `.time.Parse` helper and calling Go `time.Time.UnixMilli`.
- The compare URL used a truncated target revision in the URL. I changed the URL to use the full revision while keeping truncation only for display text elsewhere.

## Review Notes
The examples assume a single-source Argo CD Application using `.app.spec.source`. Applications using `spec.sources` need adjusted field paths. The Slack attachment examples are syntactically consistent with Argo CD notification templates, but production templates should JSON-escape untrusted message fields with `toJson` when embedding arbitrary text.
