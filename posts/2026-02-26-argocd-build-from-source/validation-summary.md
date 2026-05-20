# Validation Summary: How to Build ArgoCD from Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Go
- TypeScript/React
- Docker/Podman
- Make
- Yarn/pnpm
- Protocol Buffers
- Helm
- kind and minikube

## Sources Consulted
- Argo CD developer guide: Running Argo CD locally: https://argo-cd.readthedocs.io/en/stable/developer-guide/running-locally/
- Argo CD developer guide: Development Environment: https://github.com/argoproj/argo-cd/blob/master/docs/developer-guide/development-environment.md
- Argo CD developer guide: Toolchain Guide: https://github.com/argoproj/argo-cd/blob/master/docs/developer-guide/toolchain-guide.md
- Argo CD v2.10.2 Makefile: https://github.com/argoproj/argo-cd/blob/v2.10.2/Makefile
- Argo CD master Makefile: https://github.com/argoproj/argo-cd/blob/master/Makefile
- Argo CD v2.10.2 Dockerfile: https://github.com/argoproj/argo-cd/blob/v2.10.2/Dockerfile
- Argo CD v2.10.2 Procfile: https://github.com/argoproj/argo-cd/blob/v2.10.2/Procfile
- Argo CD master Procfile: https://github.com/argoproj/argo-cd/blob/master/Procfile
- Argo CD v2.10.2 go.mod: https://github.com/argoproj/argo-cd/blob/v2.10.2/go.mod
- Argo CD master go.mod: https://github.com/argoproj/argo-cd/blob/master/go.mod
- Argo CD v2.10.2 UI package.json: https://github.com/argoproj/argo-cd/blob/v2.10.2/ui/package.json
- Argo CD master UI package.json: https://github.com/argoproj/argo-cd/blob/master/ui/package.json
- Argo CD UI webpack config: https://github.com/argoproj/argo-cd/blob/v2.10.2/ui/src/app/webpack.config.js
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The post described Go and UI tooling as static requirements. Updated the wording to clarify that v2.10.x uses Go 1.21 and Yarn, while current development branches should be checked against `go.mod` and `ui/package.json`.
- The macOS Homebrew command used `brew install docker`, which only installs the Docker CLI on typical macOS setups. Changed it to install Docker Desktop with `brew install --cask docker`.
- The v2.10.x code generation commands can require the legacy GOPATH checkout location. Updated the clone instructions to place the repository under `$(go env GOPATH)/src/github.com/argoproj/argo-cd`.
- The code generation command `make generate-local` is not an Argo CD Makefile target. Replaced it with `make codegen-local`.
- The protobuf-only command `make protogen-local` is not an Argo CD Makefile target. Replaced it with `make protogen`.
- The image build section implied separate component images and used a non-existent `make image-argocd` target. Updated it to describe the single Argo CD image with multiple component entrypoints and replaced the invalid command with `DEV_IMAGE=true IMAGE_TAG=custom-build make image`.
- The simplified Dockerfile used the non-existent `make build-all` target and did not show how compiled UI assets are included before building the Go binary. Updated the simplified flow to build the UI, copy `ui/dist/app`, and run `make argocd-all`.
- The UI development server environment variable was incorrect. Replaced `ARGOCD_SERVER` with `ARGOCD_API_URL`, which is what the webpack config reads for API proxying.
- The local run instructions only applied CRDs. Updated them to apply `manifests/install.yaml`, set the namespace context, and scale down in-cluster Argo CD components before running local processes, matching the official developer guide.
- The `make start-local` command omitted the documented `ARGOCD_GPG_ENABLED=false` option. Added it.
- The local process list omitted supporting services. Added redis, the UI dev server, and local test Git/Helm services.
- The direct component run examples used package paths that are not standalone `main` packages. Replaced them with `ARGOCD_BINARY_NAME=<component> go run ./cmd/main.go`, matching the Procfile's consolidated binary pattern.
- The protobuf version example did not match the v2.10.2 tool version. Updated the example output to `libprotoc 3.17.3`.
- The `make install-tools-local` description listed tools that target does not install, including goreman. Updated the list to match the installer scripts and added a separate `go install github.com/mattn/goreman@latest` command.

## Review Notes
- The post remains version-sensitive because it shows v2.10.2 examples while also mentioning the current `master` branch. The added caveats point readers to `go.mod` and `ui/package.json`, but future Argo CD major versions may require additional command changes.
