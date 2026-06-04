# Validation Summary: How to Prevent Privilege Escalation with allowPrivilegeEscalation: false

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Kubernetes SecurityContext
- ValidatingAdmissionPolicy
- Linux no_new_privs
- Linux capabilities
- Falco Kubernetes audit rules

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes API reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Validating Admission Policy - https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes documentation: Namespaces automatic labelling - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Linux man-pages: prctl PR_SET_NO_NEW_PRIVS - https://man.he.net/man2/prctl
- Falco documentation: Kubernetes Audit Events - https://falco.org/docs/concepts/event-sources/plugins/kubernetes-audit/
- Falco documentation: Supported Fields for Conditions and Outputs - https://falco.org/docs/reference/rules/supported-fields/

## Issues Found
- The basic test used `sudo` inside `ubuntu:22.04` while the pod runs as UID 1000. That image does not include sudo by default, and a non-root user cannot install it with `apt-get`. Replaced the test with `grep NoNewPrivs /proc/1/status`, which directly verifies the kernel flag Kubernetes sets.
- The ping comparison depended on `ping` being installed and on legacy setuid behavior. Modern images often omit ping or use unprivileged ICMP or file capabilities. Replaced the comparison with direct `NoNewPrivs` checks.
- The post described `allowPrivilegeEscalation` as a pod security context setting in one place. Corrected it to container security context because this field is container-level.
- The explanation omitted the Kubernetes caveat that `allowPrivilegeEscalation` is always true for privileged containers or containers with `CAP_SYS_ADMIN`. Added that caveat.
- The ValidatingAdmissionPolicy snippet did not handle missing `securityContext` safely and did not check ephemeral containers. Updated the CEL expressions to require `securityContext.allowPrivilegeEscalation: false` for regular, init, and ephemeral containers, and included the `pods/ephemeralcontainers` subresource.
- The ValidatingAdmissionPolicy section did not mention that `admissionregistration.k8s.io/v1` ValidatingAdmissionPolicy is stable in Kubernetes 1.30 and later. Added the version caveat.
- The namespace exemption selector used `key: name`, which is not an automatic Kubernetes namespace label. Replaced it with `kubernetes.io/metadata.name`.
- The Falco rule used a non-existent runtime field, `k8s.pod.security.context.allow_privilege_escalation`. Replaced it with a Kubernetes audit event rule using the `k8s_audit` source and documented audit fields.

## Review Notes
The Kubernetes YAML examples use current API versions. Local `kubectl` schema validation could not be run because `kubectl` is not installed in this workspace.
