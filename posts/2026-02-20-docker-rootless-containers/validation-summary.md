# Validation Summary: How to Run Docker Containers as Non-Root for Security

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Docker and Dockerfile instructions
- Docker Official Node.js and Python images
- Google Distroless container images
- Linux users, file permissions, capabilities, and privileged ports
- Kubernetes Deployments, Services, security contexts, and Pod Security Standards

## Sources Consulted
- Docker Docs: Dockerfile `USER` instruction, https://docs.docker.com/reference/builder/#user
- Docker Docs: `docker run` user and Linux capabilities behavior, https://docs.docker.com/engine/containers/run/
- Docker Docs: rootless Docker privileged-port behavior, https://docs.docker.com/engine/security/rootless/tips/
- Node.js Docker Official Image repository, https://github.com/nodejs/docker-node
- GoogleContainerTools Distroless README, https://github.com/GoogleContainerTools/distroless
- Kubernetes Docs: Deployments, https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes API reference: Pod and SecurityContext fields, https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Docs: seccomp fields, https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes Docs: Pod Security Standards, https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found
- The Mermaid diagram stated that a container escape from a root container equals host root, and that a non-root escape equals an unprivileged user. Changed both to conditional wording because the outcome depends on the vulnerability, runtime configuration, namespaces, capabilities, and host controls.
- The distroless section said distroless images run as non-root by default. Changed this to refer specifically to the `:nonroot` variants, which matches the images used in the examples.
- The low-port section said non-root users cannot bind to ports below 1024. Changed this to note the Linux `CAP_NET_BIND_SERVICE` requirement because privileged-port behavior can be changed with capabilities or system configuration.
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added `selector.matchLabels` and `template.metadata.labels` so the manifest is structurally valid.
- The pod-level `seccompProfile` comment incorrectly described a read-only root filesystem. Changed it to describe the runtime default seccomp profile; the read-only root filesystem is already configured at container level.
- The testing section used `apt-get update` even though the Dockerfile examples are Alpine-based and may not include `apt-get`. Changed the command to `apk add curl` and clarified that it applies to Alpine-based images.

## Review Notes
- The Dockerfile examples are syntactically valid for their stated base images. In future updates, `npm ci --omit=dev` could be preferred over `npm ci --production`, but `--production` remains a recognized npm option.
- The Kubernetes hardening example is valid as a focused example, but real workloads may need writable volume mounts for additional runtime paths depending on the application framework and base image.
