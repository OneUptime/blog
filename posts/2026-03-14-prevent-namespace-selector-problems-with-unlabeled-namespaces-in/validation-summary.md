# Validation Summary: Preventing Namespace Selector Problems with Unlabeled Namespaces in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Kubernetes namespaces and labels
- Kubernetes ValidatingAdmissionPolicy
- Kyverno ClusterPolicy
- Kubernetes RBAC and CronJob
- kubectl
- Bash and Python YAML validation

## Sources Consulted
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The introduction said the root cause is always a missing namespace label. Changed this to "A common root cause" because selector problems can also come from selector syntax, wrong values, policy ordering, or other policy design issues.
- The ValidatingAdmissionPolicy CEL examples used direct field-style label checks for map keys. Changed them to use membership checks and map indexing for label keys, which matches Kubernetes CEL usage for metadata labels.
- The Kyverno example used deprecated `spec.validationFailureAction`. Moved enforcement to `rules[*].validate.failureAction`, as recommended by current Kyverno documentation.
- The defensive Calico policy comment claimed both positive and negative selectors were used, but the snippet only used explicit positive selectors. Updated the comment.
- The Calico catch-all policy had duplicate `destination` keys in one egress rule, which would make the YAML invalid or overwrite fields depending on the parser. Combined `nets` and `ports` under one `destination`.
- The CI/CD Bash and Python snippet was syntactically broken and did not safely handle file paths. Rewrote it to scan YAML files with `find -print0`, pass paths as Python arguments, and derive required labels from the Bash array.
- The audit CronJob referenced a service account without RBAC and depended on Python being present in the kubectl image. Added the ServiceAccount, ClusterRole, and ClusterRoleBinding, and replaced the Python pipeline with `kubectl` custom columns plus `awk`.
- The verification steps created an unlabeled namespace and then labeled it, which would fail when the admission policy is enforced. Changed the successful test to create the namespace with labels in the initial manifest.
- The Helm troubleshooting note suggested using `--create-namespace` plus later labeling, which can be rejected by admission control. Updated it to recommend creating a labeled namespace first or managing a labeled Namespace manifest.

## Review Notes
The Kubernetes API service IP `10.96.0.1/32` in the Calico egress example is the common default service IP, but clusters can use a different service CIDR. Readers should replace it with their own Kubernetes service ClusterIP when necessary.
