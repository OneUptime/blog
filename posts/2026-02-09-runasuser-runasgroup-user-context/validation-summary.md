# Validation Summary: How to use runAsUser and runAsGroup for specific user context

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes SecurityContext and PodSecurityContext
- Kubernetes Pod Security Standards
- Linux UID, GID, and file permissions
- Dockerfile image hardening
- kubectl and jq

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: Seccomp and Kubernetes - https://kubernetes.io/docs/reference/node/seccomp/
- Docker documentation: Dockerfile reference - https://docs.docker.com/reference/builder
- NGINX unprivileged image documentation - https://github.com/nginx/docker-nginx-unprivileged

## Issues Found
- The basic `runAsUser` example used the regular `nginx:1.21` image with an arbitrary UID and the default NGINX command. The standard NGINX image commonly expects root-owned writable paths and a default port 80 configuration, so the pod could fail when forced to run as UID 1000. Changed it to `nginxinc/nginx-unprivileged:stable-alpine`, set UID/GID 101, and exposed container port 8080.
- The multi-container example also used the regular `nginx:1.21` image with `runAsUser: 101` and `containerPort: 8080`, but `containerPort` does not change the process's listen port or filesystem expectations. Changed the image to `nginxinc/nginx-unprivileged:stable-alpine`.
- The verification output omitted the primary group from `id` output when `fsGroup` is present. Updated the expected output to include the primary group plus the supplementary `fsGroup`.
- The `su` check was not a reliable proof that the process could not become root because failure may depend on TTY, image contents, and `su` behavior. Replaced it with an `id -u` check that directly verifies the process UID.
- The troubleshooting example treated privileged port bind failure as universally expected. This can vary by runtime, sysctl, and capabilities, so the note was changed to describe failure as common without `CAP_NET_BIND_SERVICE`.

## Review Notes
- All YAML snippets parse successfully with Python/PyYAML after the edits.
- `kubectl` was not installed in the local workspace, so CLI syntax was verified against Kubernetes documentation rather than local `kubectl --help`.
