# Validation Summary: Multi-Tenancy Patterns with Helm

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm
- Kubernetes Namespaces
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes NetworkPolicy
- Kubernetes RBAC
- Kubernetes Pod Security Admission
- Hierarchical Namespace Controller (HNC)
- Kustomize Helm chart inflation
- Prometheus Operator ServiceMonitor
- Grafana dashboard ConfigMaps
- Bash scripting

## Sources Consulted
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetes-io-metadata-name
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Kustomize Helm chart example and API types: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/chart.md and https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- HNC repository and user guide: https://github.com/kubernetes-retired/hierarchical-namespaces and https://github.com/kubernetes-sigs/hierarchical-namespaces/blob/master/docs/user-guide/how-to.md
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/ and https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md

## Issues Found
- The architecture diagram referred to PodSecurityPolicy-style "Pod Security". Updated it to "Pod Security Admission" to match current Kubernetes Pod Security Standards usage.
- NetworkPolicy namespace selectors used a custom `name` label for namespaces. Changed them to `kubernetes.io/metadata.name`, the immutable namespace label set by Kubernetes.
- DNS egress allowed pods labeled `k8s-app: kube-dns` in any namespace and did not restrict DNS ports. Updated the values example to target `kube-system` and allow TCP/UDP port 53.
- The developer RBAC role mixed resources from the core, `apps`, `batch`, and deprecated `extensions` API groups in one rule. Split the rule into current API groups and removed the deprecated `extensions` API group.
- The RBAC subresource verbs for logs, exec, and port-forward were overly broad. Reduced them to the verbs needed by the common operations.
- The HNC child namespace example manually created a namespace whose name did not match the `SubnamespaceAnchor`. Updated the example to create the child namespace through a correctly named `SubnamespaceAnchor`.
- The Kustomize `helmCharts` example listed a Helm chart directory under `resources`, which is not how Kustomize inflates Helm charts. Replaced it with `helmGlobals.chartHome` and a `helmCharts` entry.
- The tenant provisioning script treated the owner argument as required in `$3`, so the documented optional tier form did not work when only tenant name and owner were passed. Updated argument parsing and quoted generated file paths.

## Review Notes
The local workspace did not have `helm`, `kubectl`, or `kustomize` installed, so CLI validation was performed against official documentation rather than local `--help` output. The HNC project repository was archived on April 17, 2025; the shown v1.1.0 install URL remains consistent with the latest archived release, but future readers should consider the maintenance status before adopting HNC for new production environments.
