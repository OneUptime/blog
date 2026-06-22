# Validation Summary: How to Handle Container Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker and Dockerfiles
- Docker Official Images
- Distroless container images
- Go container builds
- Node.js and npm
- Kubernetes Pods, security contexts, seccomp profiles, Secrets, and NetworkPolicies
- Trivy vulnerability scanning
- GitHub Actions and GitHub code scanning SARIF uploads
- External Secrets Operator

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Docker Official Image metadata for nginx, node, and golang: https://hub.docker.com/_/nginx, https://hub.docker.com/_/node, https://hub.docker.com/_/golang
- GoogleContainerTools Distroless README: https://github.com/GoogleContainerTools/distroless
- Alpine Linux releases: https://alpinelinux.org/releases/
- Go 1.26 release notes: https://go.dev/doc/go1.26
- Node.js previous releases: https://nodejs.org/en/about/previous-releases
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Trivy image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Aqua Security Trivy Action repository: https://github.com/aquasecurity/trivy-action
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- GitHub Actions secure use reference: https://docs.github.com/en/actions/reference/security/secure-use
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- Updated outdated container image tags. `alpine:3.19`, `golang:1.22-alpine`, and `node:20-alpine` are no longer appropriate current examples for a security guide validated on 2026-06-19, so they were changed to supported/current examples.
- Replaced the old nginx version and incomplete digest example. `nginx:1.25.3` was changed to `nginx:1.30.3`, and the truncated digest placeholder was replaced with a real digest for `nginx:1.30.3`.
- Corrected the Node.js production install command. `npm ci --only=production` was changed to the current explicit form `npm ci --omit=dev`.
- Fixed invalid Kubernetes security context placement. `allowPrivilegeEscalation`, `capabilities`, and `readOnlyRootFilesystem` are container security context fields, not PodSecurityContext fields, so the pod-level copies were removed and the container-level settings were retained.
- Fixed the GitHub Actions SARIF workflow. Added `contents: read` and `security-events: write` permissions for SARIF upload, and changed the Trivy action reference from the mutable `master` branch to a versioned action reference.
- Updated the External Secrets Operator example from `external-secrets.io/v1beta1` to `external-secrets.io/v1`, matching the current documented API examples.

## Review Notes
The GitHub Actions example is now version-pinned to an action release tag. For higher supply-chain assurance, GitHub recommends pinning third-party actions to a full-length commit SHA.
