# Validation Summary: How to Configure Kubernetes Pod Security Admission

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes Pod Security Admission
- Kubernetes Pod Security Standards
- Kubernetes namespaces and labels
- Kubernetes admission controller configuration
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Enforce Pod Security Standards by Configuring the Built-in Admission Controller: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Pod Security Policies removed feature page: https://kubernetes.io/docs/concepts/security/pod-security-policy/

## Issues Found
- The post stated that the Restricted Pod Security Standard requires read-only root filesystems. Kubernetes restricted PSS does not require `readOnlyRootFilesystem`; it requires controls such as `runAsNonRoot`, `allowPrivilegeEscalation: false`, seccomp, and dropping `ALL` capabilities. I corrected the explanation and reframed read-only root filesystems as additional hardening.
- The PSA verification commands used `kubectl api-resources | grep podsecurity` and namespace label inspection, which do not verify the Pod Security admission controller. I replaced them with `kubectl version` and a server-side dry-run namespace label command, matching the Kubernetes namespace-label guidance.
- The restricted pod example used the root-oriented `nginx:1.21` image with `runAsUser: 1000` and a read-only root filesystem. I changed it to `nginxinc/nginx-unprivileged:1.27` and added a writable `/tmp` `emptyDir` mount so the example is consistent with non-root execution and its hardening settings.
- The monitoring section implied that PSA violations can be checked with Kubernetes Events and showed a warning example in an `enforce: restricted` namespace. PSA audit mode adds audit annotations to audit log events, warn mode returns user-facing warnings, and kube-apiserver exposes PSA metrics. I replaced the event command and adjusted the examples accordingly.

## Review Notes
The remaining manifests use current Kubernetes API versions and valid Pod Security Admission label/configuration field names. `kubectl` was not installed in the local environment, so command flag verification was performed against the official generated Kubernetes `kubectl run` reference instead of local `--help` output.
