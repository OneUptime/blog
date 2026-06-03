# Validation Summary: How to Enforce Minimum Pod Security Standards with ValidatingAdmissionPolicy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ValidatingAdmissionPolicy
- Kubernetes ValidatingAdmissionPolicyBinding
- Kubernetes Pod Security Standards
- Kubernetes CEL expressions
- Kubernetes Pod securityContext
- kubectl
- Prometheus-style Kubernetes API server metrics

## Sources Consulted
- Kubernetes ValidatingAdmissionPolicy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes CEL documentation: https://kubernetes.io/docs/reference/using-api/cel/
- Kubernetes AppArmor documentation: https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Quantity API definition: https://kubernetes.io/docs/reference/kubernetes-api/definitions/quantity-resource/

## Issues Found
- Corrected the Kubernetes version prerequisite from 1.28 to 1.30 because ValidatingAdmissionPolicy graduated to stable in Kubernetes 1.30.
- Removed workload controller resources from the Baseline policy match rules because the expressions access `object.spec.containers`, which is valid for Pods but not for Deployments, StatefulSets, DaemonSets, or ReplicaSets.
- Fixed invalid CEL expressions that used `has()` around expression results such as `object.spec.containers.exists(...)`; `has()` is for field presence checks.
- Added missing parent-field guards before accessing optional nested fields such as `securityContext`, `capabilities`, `ports`, `sysctls`, `seccompProfile`, and `appArmorProfile`.
- Aligned Baseline hostPath, hostPort, capability, and sysctl examples with the Pod Security Standards. HostPath and hostPort are disallowed under Baseline unless explicitly exempted by policy, and safe sysctls are a documented allowlist rather than broad `kernel.shm*`, `kernel.msg*`, or `kernel.sem*` prefixes.
- Clarified that the privilege escalation check is additional hardening, not a Baseline Pod Security Standard requirement.
- Corrected Restricted examples for `runAsNonRoot`, `runAsUser`, dropped capabilities, allowed volume types, and seccomp profile handling.
- Clarified that the Restricted policy must be applied alongside the Baseline policy or include the Baseline validations, because the snippet does not duplicate all Baseline rules.
- Replaced the deprecated AppArmor annotation example with the Kubernetes 1.30+ `appArmorProfile` field.
- Fixed map key checks for labels and annotations to use the CEL `in` operator instead of `has(map['key'])`.
- Replaced brittle resource quantity string parsing with Kubernetes CEL quantity functions.
- Corrected the exemption example comment from annotation-based exemption to label-based exemption because `objectSelector` is a label selector.
- Updated the expected admission error text to match ValidatingAdmissionPolicy behavior instead of webhook denial wording.
- Replaced the webhook rejection metric with a broader API server request rejection metric for Pods, because ValidatingAdmissionPolicy is not an admission webhook.

## Review Notes
The policy examples focus on regular Pod containers. A production-grade Pod Security Standards implementation should also account for init containers and ephemeral containers, and should be tested against the Kubernetes version used by the cluster. `kubectl` was not installed in this workspace, so CLI-based dry-run validation could not be performed locally.
