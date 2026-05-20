# Validation Summary: How to Build Custom ArgoCD CLI Tools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD REST API
- Argo CD Go client library
- Go modules and cross-compilation
- Python
- Click
- Requests
- Docker

## Sources Consulted
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Argo CD `application` Go client API on pkg.go.dev: https://pkg.go.dev/github.com/argoproj/argo-cd/v2/pkg/apiclient/application
- Argo CD `apiclient` Go client API on pkg.go.dev: https://pkg.go.dev/github.com/argoproj/argo-cd/v2/pkg/apiclient
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Python `urllib.parse` documentation: https://docs.python.org/3/library/urllib.parse.html
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Go cross-compilation reference: https://tip.golang.org/wiki/WindowsCrossCompiling
- Referenced OneUptime Argo CD REST API guide: https://oneuptime.com/blog/post/2026-02-26-how-to-use-argocd-rest-api-complete-crud-operations/view

## Issues Found
- The Go setup imported Cobra but did not explicitly add it as a project dependency. Added `go get github.com/spf13/cobra@latest`.
- The Go snippet discarded the `io.Closer` returned by `NewApplicationClient`. Changed it to keep the closer and defer `Close()`, matching the Argo CD client interface.
- The Go snippet assigned `Prune: true` in `ApplicationSyncRequest`, but the Argo CD Go client type expects `*bool`. Added a local `prune := true` and passed `&prune`.
- The Go snippet sliced revisions with `revision[:7]`, which can panic for empty or short revisions. Added a `shortRevision` helper and a source revision presence check.
- The Go promotion snippet assumed `spec.source` is present. Added a guard for multi-source applications, where source-specific handling is needed.
- The Python REST examples interpolated selectors and application names directly into URLs. Replaced manual query construction with `urllib.parse.urlencode` and URL-encoded application path segments with `quote(..., safe='')`.
- The pre-flight example said it verified that the target revision exists, but the code only displayed the configured revision. Updated the comment to describe what the code actually does.

## Review Notes
- The Python snippet intentionally uses `verify=False`, which works for development or private test environments but should be replaced with proper CA validation for production use.
- The Go promotion example now explicitly handles single-source applications. Multi-source Argo CD applications need source-specific promotion logic.
- Python snippet syntax was checked with `compile(...)`. The Go snippet was reviewed against the official Go API documentation, but a local Go compiler was not available in this environment.
