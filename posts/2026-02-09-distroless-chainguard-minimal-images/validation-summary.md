# Validation Summary: How to Build Minimal Container Images with Distroless and Chainguard

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker multi-stage builds
- Google Distroless container images
- Chainguard Images
- Go
- Node.js and npm
- Python
- Kubernetes Deployments, security contexts, probes, and ephemeral containers
- kubectl debug, kubectl cp, and kubectl logs

## Sources Consulted
- GoogleContainerTools Distroless README: https://github.com/GoogleContainerTools/distroless
- Chainguard Node image overview: https://images.chainguard.dev/directory/image/node/overview
- Chainguard Python migration guide: https://edu.chainguard.dev/chainguard/migration/migration-guides/migrating-python/
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js Release Working Group schedule: https://github.com/nodejs/release
- Go release history: https://go.dev/doc/devel/release

## Issues Found
- Distroless examples used Debian 11 tags. Updated them to Debian 13 tags to match the current Distroless image catalog.
- The Go builder used Go 1.21, which is no longer within the current Go support window. Updated the builder image to Go 1.26 and simplified the static build flags.
- The Node.js builder used Node 18, which reached end-of-life on April 30, 2025. Updated it to Node 24.
- The npm production install command used `npm ci --only=production`. Updated it to the current `npm ci --omit=dev` form.
- The Chainguard Python example installed packages with a Docker official Python builder and then used `CMD ["python", "app.py"]` with Chainguard Python's Python entrypoint, which would pass `python app.py` as arguments to Python. Updated the example to use the Chainguard `latest-dev` builder, copy a virtual environment into the runtime image, set the venv Python as the entrypoint, and use `CMD ["app.py"]`.
- The ephemeral container YAML showed `ephemeralContainers` in a new Pod manifest. Kubernetes documentation states ephemeral containers are added to existing Pods through the API and cannot be specified when creating a Pod. Replaced the invalid manifest with a note and kept the `kubectl debug` workflow.
- The `kubectl cp` example implied it works normally with distroless images. Kubernetes documents that `kubectl cp` requires `tar` in the target image, so the example now includes that caveat.
- The process-list debug command did not target the application container's process namespace. Added `-it` and `--target=app` so the command matches the intended ephemeral-container debugging workflow.
- The conclusion said minimal images "eliminate attack surface." Changed this to "reduce attack surface" to avoid an absolute security claim.

## Review Notes
The Kubernetes Deployment security context fields, probe structure, Distroless debug image concept, Chainguard non-root behavior, and kubectl debug usage are technically sound after the corrections above. In production examples, image tags should ideally be pinned by digest rather than `latest`, but this was left unchanged because the post is an introductory tutorial and the existing examples use placeholder application images.
