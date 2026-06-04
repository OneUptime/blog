# Validation Summary: How to Configure ServiceAccount automountServiceAccountToken False

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes Pods, Deployments, and StatefulSets
- Kubernetes Pod Security Standards and Pod Security Admission labels
- OPA Gatekeeper ConstraintTemplates and Constraints
- `kubectl`, Bash, and `jq`

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes ServiceAccount API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-account-v1/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- OPA Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper constraint violation and enforcement documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/

## Issues Found
- The override example created the ServiceAccount in the `production` namespace but omitted `metadata.namespace` on the two Pods. Added `namespace: production` to both Pods so `serviceAccountName: flexible-sa` resolves correctly.
- The Pod Security Standards section said Pod Security Standards can enforce token mounting policies and that the restricted profile encourages disabling token mounting. Kubernetes Pod Security Standards do not include an `automountServiceAccountToken` control, so this was corrected to explain that PSS should be paired with a policy engine for this requirement.
- The Gatekeeper `ConstraintTemplate` used the older `templates.gatekeeper.sh/v1beta1` API. Updated it to `templates.gatekeeper.sh/v1` and added the required structural `openAPIV3Schema` with `type: object`.
- The troubleshooting command only checked `.spec.automountServiceAccountToken`, which can be empty when behavior is inherited from the ServiceAccount. Added a note and a ServiceAccount check.
- The audit script reported Pods as having automatic token mounting whenever the Pod did not explicitly set `automountServiceAccountToken: false`, but a ServiceAccount-level false setting can still disable the mount. Updated the script to evaluate both Pod and ServiceAccount settings.

## Review Notes
- Local checks: all YAML snippets parsed successfully with PyYAML, all Bash snippets passed `bash -n`, and `validation.json` was validated with `jq`.
- `kubectl` and `opa` are not installed in this workspace, so CLI behavior and Gatekeeper Rego behavior were verified against official documentation and static syntax inspection rather than live cluster or OPA execution.
