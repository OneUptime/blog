# Validation Summary: How to Configure Pod Security Contexts on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Contexts (pod-level and container-level)
- Kubernetes Pod Security Standards / PodSecurity admission controller
- Talos Linux
- Linux capabilities
- nginx (nginxinc/nginx-unprivileged image)
- Prometheus node-exporter
- kubectl

## Sources Consulted
- Kubernetes documentation — Configure a Security Context for a Pod or Container: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation — Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation — Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes API reference — SecurityContext and PodSecurityContext field definitions
- Docker Hub — nginxinc/nginx-unprivileged image documentation (default UID/GID 101)
- Prometheus node_exporter documentation (default UID 65534)
- Talos Linux documentation: https://www.talos.dev/

## Issues Found
- **Incorrect requirement for restricted PSS**: The post stated that the restricted Pod Security Standard "includes requirements like running as non-root, dropping all capabilities, and using a read-only root filesystem." The restricted profile does NOT mandate `readOnlyRootFilesystem`. The actual restricted-profile requirements include running as non-root, dropping ALL capabilities (and only allowing NET_BIND_SERVICE to be added), disallowing privilege escalation, and requiring a seccomp profile (RuntimeDefault or Localhost). Updated the sentence to accurately reflect the restricted profile's requirements while still encouraging `readOnlyRootFilesystem` elsewhere in the post as a best practice.

## Review Notes
- The YAML examples are syntactically valid and correctly distinguish pod-level vs container-level fields. Container-level overrides apply only to overlapping fields (e.g., `runAsUser`), which the post correctly conveys.
- The `nginxinc/nginx-unprivileged` image does default to UID/GID 101 and listens on port 8080, matching the example.
- `prom/node-exporter` does run as UID 65534 (nobody) by default, matching the example.
- The PodSecurity admission labels (`enforce`, `audit`, `warn`) and the `restricted` profile name are correct.
- The `runAsNonRoot` description is reasonable; technically the kubelet validates the effective container user at start time, not just the image USER directive, but the post's framing as a safety net is accurate enough for a guide.
- Using `kubectl run --image=nginx` against a restricted-enforced namespace would indeed be rejected because the default nginx image runs as root and lacks the required security fields — note that the rejection will likely cite multiple violations (root user, missing capabilities drop, missing seccomp profile, allowPrivilegeEscalation), not only the root-user violation, but the example outcome is correct.
- Consider mentioning `seccompProfile: { type: RuntimeDefault }` in a future revision since it is required by the restricted PSS profile and was not shown in any of the example manifests.
