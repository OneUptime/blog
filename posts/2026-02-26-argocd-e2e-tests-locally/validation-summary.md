# Validation Summary: How to Run ArgoCD E2E Tests Locally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD E2E testing
- Kubernetes
- kind
- kubectl
- Kustomize
- Go testing
- Argo CD CLI
- Docker

## Sources Consulted
- Argo CD E2E test documentation: https://argo-cd.readthedocs.io/en/release-3.3/developer-guide/test-e2e/
- Argo CD development cycle documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/development-cycle/
- Argo CD running locally documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/running-locally/
- Argo CD Makefile and E2E fixtures in the official repository: https://github.com/argoproj/argo-cd
- Argo CD generated CLI docs for `argocd app get`, `argocd app resources`, and `argocd account generate-token`: https://github.com/argoproj/argo-cd/tree/master/docs/user-guide/commands
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/
- kind documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Go command documentation: https://go.dev/cmd/go/

## Issues Found
- The post described `make start-e2e` as building Argo CD images and deploying a full Argo CD instance into kind. Updated it to match Argo CD's documented workflow: the target builds the test-tools image, applies E2E resources to the current cluster, and starts local Argo CD services.
- Replaced the non-existent `make generate-local` target with the current `make codegen-local` target.
- Removed the invalid `test/container/kind.yaml` example because the current Argo CD repository does not contain that kind config file.
- Replaced direct `go test ./test/e2e/...` examples with the documented `make test-e2e`, `make test-e2e-local`, `TEST_FLAGS`, and `TEST_MODULE` workflows.
- Corrected E2E environment variable examples, including the remote-style Git service URL and `ARGOCD_E2E_TEST_TIMEOUT`, and removed an unsupported Kustomize skip example.
- Updated Go snippets from the old `github.com/argoproj/argo-cd/v2` module path to the current `v3` module path, added required imports, removed unused variables, and replaced non-existent fixture methods such as `Helm()`, `Values()`, and `DestNamespace()`.
- Replaced the non-existent `argocd app sync-status` command with `argocd app get`.
- Corrected debug and cleanup commands to use the E2E namespace and local-service workflow instead of an `argocd` namespace deployment workflow.

## Review Notes
The full E2E suite duration is machine-dependent; the post's 30 to 60 minute estimate is plausible but not guaranteed. The article now tracks the current Argo CD v3 development workflow, so future Argo CD major-version changes may require another pass.
