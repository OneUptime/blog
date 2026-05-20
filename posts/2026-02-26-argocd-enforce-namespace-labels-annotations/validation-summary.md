# Validation Summary: How to Enforce Namespace Labels and Annotations with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications and automated sync
- Argo CD ApplicationSets
- Kubernetes namespaces, labels, annotations, and label selectors
- Kubernetes Pod Security Admission labels
- Kyverno ClusterPolicy validation and mutation rules
- OPA Gatekeeper ConstraintTemplates and Constraints
- Istio namespace sidecar injection labels
- kubectl and jq commands

## Sources Consulted
- Kyverno Validate Rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Mutate Rules: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno Variables and Background Scans: https://kyverno.io/docs/policy-types/cluster-policy/variables/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD ApplicationSet Matrix Generator: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet List Generator: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-List/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl get Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Gatekeeper How to Use: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper ConstraintTemplates: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Istio Sidecar Injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The Kyverno validation policy used top-level `spec.validationFailureAction: Enforce`, which Kyverno documents as deprecated. I moved the enforcement setting to `validate.failureAction: Enforce` on each validation rule.
- The Kyverno label validation failure message said "Missing labels" while interpolating the current label map, not a computed missing-label list. I changed this to "Current labels" so the message accurately describes what is shown.
- The annotation validation rule excluded the common system and Argo CD namespaces but omitted `kyverno`, while the label validation rule excluded it. I added `kyverno` to the annotation rule exclusion list for consistency and to avoid requiring team annotations on the Kyverno namespace.

## Review Notes
The remaining examples align with the consulted official documentation. Argo CD self-healing, ApplicationSet list and matrix generators, Kubernetes namespace labels for Pod Security Admission, Istio `istio-injection=enabled`, Gatekeeper `ConstraintTemplate` structure, and the kubectl label-selector commands are technically valid. Kyverno's older `validationFailureAction` field may still work in existing installations, but the updated rule-level `failureAction` is the current documented form.
