# Validation Summary: Exclude Namespaces Without Creating a Gatekeeper Bypass

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OPA Gatekeeper
- Kubernetes admission control
- Gatekeeper Constraints and ConstraintTemplates
- Gatekeeper `Config`
- Kubernetes namespaces, labels, selectors, and RBAC
- Gatekeeper Helm chart
- `kubectl`

## Sources Consulted
- [Gatekeeper v3.23: Exempting Namespaces](https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/)
- [Gatekeeper v3.23: Customizing Admission Behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Gatekeeper v3.23: Constraint matching](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/#the-match-field)
- [Gatekeeper v3.23: Runtime flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper v3.23 source: Config singleton key](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/keys/config.go)
- [Gatekeeper v3.23 source: Installation namespace lookup](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/util/pod_info.go)
- [Gatekeeper v3.23 Helm chart values](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/charts/gatekeeper/values.yaml)
- [Gatekeeper v3.23 Helm controller-manager deployment template](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/charts/gatekeeper/templates/gatekeeper-controller-manager-deployment.yaml)
- [Gatekeeper v3.23: Integration with Kubernetes Validating Admission Policy](https://open-policy-agent.github.io/gatekeeper/website/docs/validating-admission-policy/)
- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#matching-requests-namespaceSelector)
- [Kubernetes: `kubectl label`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [Kubernetes: `kubectl apply`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: RBAC Good Practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)

## Issues Found
- The Constraint example did not state that its custom `K8sRequiredLabels` kind depends on a matching ConstraintTemplate. Added the prerequisite so readers do not expect the Constraint manifest to work before its CRD is installed.
- The post said the singleton `Config` must be in `gatekeeper-system`. That is only the default installation namespace; Gatekeeper reconciles `config` in its own installation namespace. Corrected the requirement while retaining the default as an example.
- The Helm guidance used `controllerManager.exemptNamespaces` for both exact names and prefixes. Corrected it to use `controllerManager.exemptNamespaces` for exact names and `controllerManager.exemptNamespacePrefixes` for prefixes.
- The security guidance implied Kubernetes RBAC could protect individual Namespace labels while still permitting general Namespace updates. RBAC authorizes resource operations, not individual metadata fields. Clarified that RBAC should limit Namespace update and patch permissions and that admission policy is needed for label-level controls.

## Review Notes
- Review performed against Gatekeeper v3.23 documentation and chart sources and Kubernetes v1.36 documentation.
- `config.gatekeeper.sh/v1alpha1` remains alpha in Gatekeeper v3.23, while `constraints.gatekeeper.sh/v1beta1` remains the documented Constraint API.
- Gatekeeper v3.23 can generate Kubernetes ValidatingAdmissionPolicy resources for CEL-based templates. Its default enforcement-scope synchronization honors Constraint matching, webhook selectors, `Config` exclusions, and namespace exemption flags. The `--sync-vap-enforcement-scope` flag is deprecated for removal in Gatekeeper v3.24, so this behavior should be rechecked during upgrades.
