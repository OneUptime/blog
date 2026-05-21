# Validation Summary: How to Configure Namespace-Scoped RBAC for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio networking, security, and telemetry custom resources
- Kubernetes RBAC, ClusterRoles, RoleBindings, and ClusterRoleBindings
- kubectl authorization checks and impersonation flags
- Kyverno generate policies
- OPA Gatekeeper ConstraintTemplates and constraints
- Bash and jq automation

## Sources Consulted
- Kubernetes RBAC Authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Telemetry API documentation: https://istio.io/latest/docs/reference/config/telemetry/
- Kyverno generate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno match and exclude documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- OPA Gatekeeper usage and ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/

## Issues Found
- The namespace watcher script parsed `kubectl get namespaces --watch -o json` one shell line at a time, which is not reliable JSON parsing. I changed it to pipe complete watch objects through `jq -r --unbuffered` and then read namespace/team pairs from tab-separated output.
- The Kyverno generate example omitted the Kubernetes RBAC prerequisite for generating RoleBindings that grant a ClusterRole. I added the required ClusterRoleBinding for the Kyverno background controller ServiceAccount to avoid Kubernetes privilege-escalation denial.
- The Gatekeeper `ConstraintTemplate` used `templates.gatekeeper.sh/v1` without a validation schema. I added `spec.crd.spec.validation.openAPIV3Schema` as required by the current Gatekeeper v1 template pattern.
- The Gatekeeper Rego treated any dotted hostname as a Kubernetes service name, which could reject external hostnames. I narrowed the check to Kubernetes-style service host formats before extracting the namespace.

## Review Notes
The RBAC pattern itself is correct: a namespaced RoleBinding may reference a ClusterRole and grants those permissions only inside the RoleBinding namespace. The examples intentionally use broad Istio permissions; in production, teams may also want admission controls for risky resources such as EnvoyFilter and ServiceEntry.
