# Validation Summary: How to Use Tilt for ArgoCD Development

## Status
validated

## Post Type
Tutorial / development workflow guide

## Technologies Covered
- Argo CD
- Tilt and Tiltfile Starlark APIs
- Kubernetes
- kind local clusters
- Docker and local registries
- Go
- Node.js and pnpm
- Delve debugging

## Sources Consulted
- Tilt Tiltfile API reference: https://docs.tilt.dev/api.html
- Tilt Live Update reference: https://docs.tilt.dev/live_update_reference.html
- Tilt local_resource documentation: https://docs.tilt.dev/local_resource.html
- Tilt resource dependencies documentation: https://docs.tilt.dev/resource_dependencies.html
- kind local registry documentation: https://kind.sigs.k8s.io/docs/user/local-registry/
- Argo CD contributors quick-start: https://argo-cd.readthedocs.io/en/release-3.0/developer-guide/contributors-quickstart/
- Argo CD official repository Tiltfile: https://github.com/argoproj/argo-cd/blob/master/Tiltfile
- Argo CD go.mod: https://github.com/argoproj/argo-cd/blob/master/go.mod
- Argo CD UI package metadata: https://github.com/argoproj/argo-cd/blob/master/ui/package.json
- Argo CD Tilt Dockerfiles: https://github.com/argoproj/argo-cd/blob/master/Dockerfile.tilt and https://github.com/argoproj/argo-cd/blob/master/Dockerfile.ui.tilt

## Issues Found
- The prerequisites listed fixed Go 1.21+ and Node.js 20+ with yarn. Argo CD now declares its required Go version in `go.mod`, and the current UI tooling uses pnpm with the Node version from `Dockerfile.ui.tilt`; the post now tells readers to follow those project files instead of outdated versions.
- The kind local registry setup used an older containerd mirror patch and `registry:2`. Updated it to the current kind-documented `config_path`/`hosts.toml` approach, `registry:3`, loopback host binding, and the standard `local-registry-hosting` ConfigMap.
- The main Tiltfile used `manifests/base`, `ui/Dockerfile.dev`, `yarn`, and a non-existent `k8s_image_json_path()` function. Replaced those with Argo CD's current Tilt development path (`manifests/dev-tilt`), `Dockerfile.tilt`, the deployed image ref `quay.io/argoproj/argocd:latest`, `argocd-job`, `pnpm`, and documented Tilt APIs.
- The Go build examples used `go build ... ./cmd` and a narrow dependency list. Updated them to build `cmd/main.go` with `-mod=readonly` and include the current Argo CD component directories used by the official Tiltfile.
- The debug example exposed a port but did not actually run the process under Delve. Updated it to use a Delve entrypoint and to forward local port `9345` to container port `2345`, matching Argo CD's Tilt development pattern.

## Review Notes
The post remains a simplified guide. Argo CD already includes an official Tiltfile, so future maintenance should prefer linking readers to the repository's current Tiltfile for exact component coverage rather than duplicating the full configuration in the article.
