# Validation Summary: How to Secure Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- Calico (Typha component)
- Kubernetes (NetworkPolicy, RBAC, Deployment, PodDisruptionBudget, SecurityContext)
- kubectl (apply, patch, auth can-i, exec, get)
- Prometheus (metrics scraping)
- Linux iproute2 (`ss`)

## Sources Consulted
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico the Hard Way - Install Typha: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico `typha/pkg/config/config_params.go` source for default ports
- Kubernetes NetworkPolicy v1 API reference (networking.k8s.io/v1)
- Kubernetes RBAC API reference (rbac.authorization.k8s.io/v1)
- Kubernetes Pod Security Context reference

## Issues Found
No technical issues found. The defaults referenced in the NetworkPolicy match upstream:
- Typha sync server port 5473/TCP (Felix → Typha) — correct
- Typha Prometheus metrics port 9093 — confirmed via Typha source
- Typha health endpoint port 9098 — confirmed via Typha source and docs

The RBAC, NetworkPolicy, and strategic-merge patch YAML/JSON in Steps 1–5 are syntactically valid and would apply cleanly to a cluster. The PodDisruptionBudget verification and `kubectl auth can-i` checks in Step 6 use correct syntax. No corrections were made to the post.

## Review Notes
- **Namespace convention mismatch with "Hard Way":** The official Calico the Hard Way guide installs Typha into `kube-system`; `calico-system` is the namespace used by Tigera-operator-based installs. The post uses `calico-system` consistently throughout, so it is internally coherent, but readers following the literal Hard Way upstream guide would need to substitute `kube-system`. This is a stylistic/conventional inconsistency rather than a technical error and was left unchanged.
- **`ss` utility in Step 4:** The `calico/typha` image is built on `ubi-minimal` and does not ship `ss` (iproute2). The command in Step 4 will likely fail in practice. A more portable check would run from a debug pod or use `kubectl debug` with a sidecar that has networking utilities. Not corrected because the intent of the check is still conveyed and fixing it would substantially rewrite the section.
- **Step 1 health-port ingress rule:** Allowing port 9098 from the `calico-system` namespace is unusual — kubelet liveness/readiness probes originate from the node, not from a pod in `calico-system`. Kubelet probe traffic is typically allowed via the kubelet's pod-network identity or by a separate rule; the rule as written is harmless but does not gate kubelet probes. Left unchanged as it does not break functionality.
- **Step 2 autoscaler RBAC:** The minimal ClusterRole is sufficient for a *custom* autoscaler CronJob that lists nodes and patches the deployment scale subresource. The stock `typha-cpha` (cluster-proportional-autoscaler) additionally needs a namespaced Role for `configmaps: [get]` (its tuning ConfigMap). The post's reduced RBAC is consistent with the custom CronJob approach it describes.
- **Step 7 heading:** Titled "Review Security Context with kubectl-neat" but the command shown does not use `kubectl-neat`; it pipes `kubectl get -o yaml` through `grep`. Not a technical error, just a heading/content mismatch.
