# Validation Summary: How to Use Kubernetes Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (Namespaces, ResourceQuota, LimitRange, NetworkPolicy, RBAC, Service, ExternalName)
- kubectl CLI
- krew plugin manager
- kubectx / kubens community tools
- OPA Gatekeeper (mentioned)
- YAML manifest configuration

## Sources Consulted
- Kubernetes official documentation — Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes documentation — Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation — Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes documentation — Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation — RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation — Services and DNS: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes documentation — kubectl config set-context: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#set-context
- kubectx / kubens repository: https://github.com/ahmetb/kubectx
- krew plugin index: https://krew.sigs.k8s.io/plugins/

## Issues Found
- Fixed two markdown formatting issues where section headings were missing their heading markers:
  - "Resource Quotas" (above the resource quota intro) now uses `## Resource Quotas` so it renders as a proper top-level section heading consistent with the rest of the document.
  - "Resource Quota Exceeded" (in Troubleshooting) now uses `### Resource Quota Exceeded` so it renders as a subsection consistent with sibling troubleshooting headings.

No technical inaccuracies were found in code, YAML manifests, kubectl commands, API versions, DNS naming conventions, or descriptions of Kubernetes behavior. Verified items include:
- The four default namespaces (default, kube-system, kube-public, kube-node-lease) and their purposes.
- `kubectl create namespace` and `kubectl apply -f` usage.
- `kubectl config set-context --current --namespace=<ns>` syntax.
- The krew plugin name `ns` (installed via `kubectl krew install ns`, invoked as `kubectl ns`).
- ResourceQuota `apiVersion: v1` and supported quota keys (requests.cpu, requests.memory, limits.cpu, limits.memory, requests.storage, persistentvolumeclaims, pods, services, secrets, configmaps).
- LimitRange `apiVersion: v1` with Container and Pod types and the `default`, `defaultRequest`, `min`, `max` fields.
- NetworkPolicy `apiVersion: networking.k8s.io/v1`, the deny-all-ingress pattern (empty podSelector + Ingress policyType + no rules), namespaceSelector / podSelector semantics.
- RBAC `apiVersion: rbac.authorization.k8s.io/v1` Role/RoleBinding structure and subresource names (`pods/log`, `pods/exec`, `pods/portforward`).
- Cross-namespace DNS format `<service>.<namespace>.svc.cluster.local`.
- ExternalName Service configuration.
- `kubectl patch namespace ... -p '{"metadata":{"finalizers":null}}' --type=merge` is a valid command form for clearing finalizers on a stuck namespace.

## Review Notes
- The RBAC rules combine multiple apiGroups (`["", "apps", "batch"]`) with multiple resources in a single rule. This is syntactically valid and a common shorthand, but it grants permission to any matching (apiGroup, resource) pair, which is broader than splitting into per-apiGroup rules. This is a stylistic note, not an error.
- The finalizer troubleshooting example patches `metadata.finalizers`. The `kubernetes` finalizer commonly shown in the example output actually lives in `spec.finalizers` on a Namespace, which historically required hitting the `/finalize` subresource (via `kubectl proxy` or `kubectl replace --raw`). The shown patch will correctly clear custom finalizers in `metadata.finalizers` but may not in itself remove the built-in `kubernetes` finalizer in every cluster version — readers should verify which finalizer field is populated before patching. This is a nuance, not an outright error, and the surrounding "only do this if you know why" warning is appropriate.
- The `kubectl run debug ... -- wget -qO- http://api.production.svc.cluster.local` command relies on busybox's built-in `wget` and an HTTP service on port 80; readers will need to adjust the URL/port for non-default service ports.
- All apiVersions used (`v1`, `apps/v1`, `networking.k8s.io/v1`, `rbac.authorization.k8s.io/v1`) are current and non-deprecated as of recent Kubernetes releases.
