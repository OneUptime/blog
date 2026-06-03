# Validation Summary: How to Configure readOnlyRootFilesystem for Immutable Container Filesystems

## Status
validated

## Post Type
Tutorial / Kubernetes security hardening guide

## Technologies Covered
- Kubernetes Pods, Deployments, and StatefulSets
- Kubernetes container and pod securityContext
- Kubernetes emptyDir volumes
- Kubernetes ValidatingAdmissionPolicy and ValidatingAdmissionPolicyBinding
- kubectl commands
- Dockerfile authoring for Node.js containers
- Linux tracing tools: strace and inotifywait

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Volumes / emptyDir - https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes documentation: Validating Admission Policy - https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes documentation: kubectl patch reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes API reference v1.36 - https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- Docker documentation: Containerize a Node.js application - https://docs.docker.com/guides/nodejs/containerize/
- Local Docker Buildx static check for the Dockerfile snippet.

## Issues Found
- Several examples ran containers as non-root users while mounting writable volumes, but did not set `fsGroup` or `runAsGroup`. Kubernetes applies `fsGroup` to supported volumes so non-root processes can write them. Added `fsGroup` and matching `runAsGroup` values to the affected nginx, web application, Java, PostgreSQL, and init-container examples.
- The ValidatingAdmissionPolicy only checked `spec.containers` and directly dereferenced `securityContext`. Updated the CEL expression to first check that `securityContext` exists and to also cover `initContainers` and `ephemeralContainers` when present.
- The Dockerfile used `npm ci --only=production`. Updated it to the current `npm ci --omit=dev` form used in Docker's Node.js guidance.
- The automated test used nginx with only `/tmp` mounted, even though the article correctly states nginx also needs writable cache and runtime directories. Changed the test pod to a simple sleeping BusyBox container so the read-only root filesystem behavior can be tested with only `/tmp` mounted.

## Review Notes
- `kubectl` is not installed in the local environment, so kubectl commands were checked against official Kubernetes command documentation rather than executed locally.
- YAML blocks were parsed successfully with PyYAML. Bash syntax was checked where possible; placeholder commands containing `<pod-name>` are illustrative and not directly shell-runnable without replacing the placeholder.
