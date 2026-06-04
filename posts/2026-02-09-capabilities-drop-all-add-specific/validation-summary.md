# Validation Summary: How to use securityContext with capabilities drop ALL and add specific

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods and DaemonSets
- Kubernetes securityContext
- Linux capabilities
- Pod Security Standards and Pod Security Admission
- kubectl and capsh runtime inspection commands

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: Pod Security Admission - https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Linux capabilities manual page - https://man7.org/linux/man-pages/man7/capabilities.7.html
- Local capsh help output for the `--decode` and `--print` options

## Issues Found
- The Pod Security Standards section said the Restricted standard permits adding specific capabilities after dropping all. Current Kubernetes Restricted policy only permits adding `NET_BIND_SERVICE`, so the sentence was corrected.
- The debug example used `ubuntu:20.04`, ran as a non-root user, dropped all capabilities, and then attempted to install `libcap2-bin` at runtime while also using `nc`, which was not installed. The example now uses a placeholder debug image that already includes `capsh` and `nc`.
- The DaemonSet example implied a node-exporter-style workload should add `SYS_TIME`. That capability is not required for serving metrics and grants system clock modification privileges, so the example now drops all capabilities without adding any back.

## Review Notes
- The Kubernetes capability names correctly omit the `CAP_` prefix in manifests.
- The YAML code blocks were parsed locally after the edits.
- Some examples use placeholder images such as `myapp:1.0`, `network-tool:1.0`, and `debug-tools:1.0`; these are illustrative and would need real images with the expected binaries and filesystem layout in an actual cluster.
