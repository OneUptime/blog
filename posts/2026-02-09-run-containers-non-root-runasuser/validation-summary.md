# Validation Summary: How to Run Containers as Non-Root Users with runAsUser and runAsGroup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods, Deployments, StatefulSets, init containers, and security contexts
- Kubernetes `runAsUser`, `runAsGroup`, `runAsNonRoot`, `fsGroup`, and Linux capabilities
- Kubernetes ValidatingAdmissionPolicy and ValidatingAdmissionPolicyBinding
- Dockerfile `USER`, `COPY --chown`, and `EXPOSE`

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes API reference: Pod v1 security context fields - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Validating Admission Policy - https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes API reference: ValidatingAdmissionPolicyBinding v1 - https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-binding-v1/
- Docker documentation: Dockerfile reference, including `COPY --chown` and `EXPOSE` - https://docs.docker.com/reference/dockerfile/

## Issues Found
- The basic `runAsUser` example used `nginx:1.25` with an arbitrary UID. The official nginx image commonly requires writable nginx runtime paths and port configuration changes when run as non-root, so the example might not actually start. Changed it to a `busybox:1.36` sleep container, which matches the Kubernetes security context documentation pattern and demonstrates the UID/GID behavior directly.
- The "Handling Images That Default to Root" example used `nginx:1.25` with UID/GID 101 and no command or nginx-specific permission changes. Changed it to a `busybox:1.36` container that runs `id` and sleeps, making the root-default override example runnable.
- The Dockerfile explanation said `EXPOSE` exposes a non-privileged port. Docker `EXPOSE` documents container port metadata; it does not publish or bind the port by itself. Changed the wording to "Documents a non-privileged port."
- The privileged-port capability example used nginx as a non-root process without handling nginx filesystem requirements. Changed it to a Python HTTP server bound to port 80 with `NET_BIND_SERVICE`, which more directly demonstrates the capability.
- The `fsGroup` explanation was too absolute. Kubernetes applies `fsGroup` only for volume types that support it, and CSI drivers with `VOLUME_MOUNT_GROUP` support may apply ownership and permissions themselves. Added that caveat.
- The ValidatingAdmissionPolicy expressions did not safely check for missing `securityContext`, denied pods that used valid pod-level `runAsUser` defaults, and could allow container-level overrides that contradicted pod-level settings. Updated the CEL expressions to check field presence, allow pod-level defaults, and reject explicit root or `runAsNonRoot: false` overrides.
- The sample `id` output omitted the primary group from the supplementary groups list. Updated the expected output to include `groups=1000,2000`.
- The `fsGroup` common pitfall said to always specify `fsGroup` for persistent volumes. Changed it to specify `fsGroup` when group-based access is needed and the volume type supports it.

## Review Notes
- The admission policy example covers regular `spec.containers`. A production policy may also need to account for `initContainers` and `ephemeralContainers`, depending on whether the cluster allows root init containers for permission setup.
