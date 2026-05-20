# Validation Summary: How to Contribute to ArgoCD Open Source Project

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Go
- React
- TypeScript
- Lua resource customizations
- GitHub CLI
- pnpm
- Docker/Podman development toolchain

## Sources Consulted
- Argo CD repository README: https://github.com/argoproj/argo-cd
- Argo CD Development Environment: https://argo-cd.readthedocs.io/en/latest/developer-guide/development-environment/
- Argo CD Toolchain Guide: https://argo-cd.readthedocs.io/en/latest/developer-guide/toolchain-guide/
- Argo CD Running Locally guide: https://argo-cd.readthedocs.io/en/latest/developer-guide/running-locally/
- Argo CD Submit Your PR guide: https://argo-cd.readthedocs.io/en/latest/developer-guide/submit-your-pr/
- Argo CD Code Contribution Guide: https://argo-cd.readthedocs.io/en/latest/developer-guide/code-contributions/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD upstream `go.mod`: https://raw.githubusercontent.com/argoproj/argo-cd/master/go.mod
- Argo CD upstream `ui/package.json`: https://raw.githubusercontent.com/argoproj/argo-cd/master/ui/package.json
- Argo CD upstream `Makefile`: https://raw.githubusercontent.com/argoproj/argo-cd/master/Makefile
- Argo CD upstream PR template: https://raw.githubusercontent.com/argoproj/argo-cd/master/.github/pull_request_template.md

## Issues Found
- The dependency list said "Go 1.21+" even though the current upstream guidance is to use the version specified in `go.mod`, which currently declares Go 1.26.1. Changed the text to point readers at `go.mod`.
- The UI dependency instructions referenced Yarn, but the current Argo CD UI uses pnpm and declares `packageManager: pnpm@10.28.1`. Replaced Yarn commands with pnpm commands.
- The generated-code command used `make generate-local`, which is not a current upstream Makefile target. Replaced it with `make codegen-local`.
- The UI sync example used an outdated `services.applications.sync(application.metadata.name, syncOptions)` call shape. Updated it to include the namespace, revision, prune/dry-run flags, sync strategy, selected resources, and sync options arguments used by the current Argo CD UI service.
- The resource customization snippet was marked as `yaml` even though the content is Lua. Changed the fenced code language to `lua`.
- The community section referenced only `#argo-cd` and bi-weekly meetings. Updated it to include the contributor Slack channel and current weekly contributor/monthly user meeting cadence reflected in the official docs.

## Review Notes
The guide is technically relevant and broadly aligned with current Argo CD contribution documentation. The upstream docs contain both virtualized and local Make targets; the post now uses current local-toolchain commands where it discusses local development.
