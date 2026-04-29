# Validation Summary: How to Configure Kubernetes Cluster Policies in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- OPA Gatekeeper
- ResourceQuota
- LimitRange
- `kubectl`

## Sources Consulted
- Portainer documentation: Kubernetes setup page, https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer documentation: Kubernetes security constraints, https://docs.portainer.io/user/kubernetes/cluster/security
- Portainer documentation: Kubernetes policies overview, https://docs.portainer.io/admin/environments/policies/kubernetes-policies
- Portainer documentation: Create a Kubernetes security policy, https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-security-policy
- Portainer documentation: Create a Kubernetes setup policy, https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-setup-policy
- Portainer documentation: Policies feature overview, https://docs.portainer.io/admin/environments/policies
- Portainer documentation: Cluster policies view, https://docs.portainer.io/user/kubernetes/cluster/policies
- Kubernetes documentation: Resource Quotas, https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: Limit Ranges, https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes documentation: Configure a Security Context for a Pod or Container, https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes API reference: Pod `hostNetwork`, https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- Kubernetes documentation: Volumes (`hostPath`), https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The post originally treated Portainer's Kubernetes governance features as a single `Cluster > Setup` "cluster policies" section. I corrected this to distinguish `Cluster > Setup`, `Cluster > Security constraints`, `Cluster > Policies`, and admin-managed reusable policies under `Environment-related > Policies`, because Portainer documents these as separate features.
- The original privileged-container section used the wrong Portainer terminology. I changed it to Portainer's documented `Restrict running privileged containers` behavior so the explanation matches the actual security constraint.
- The original "bind mounts" section used Docker terminology for Kubernetes. I corrected it to `hostPath` volumes and noted that Portainer restricts volume types and host filesystem paths, which is how Kubernetes host filesystem access is represented.
- The original host networking section claimed Portainer blocks `hostNetwork: true` directly. I corrected this to Portainer's documented `Restrict host networking ports` behavior, because the UI exposes port-range restrictions rather than a simple host-network allow/deny toggle.
- The original text implied Portainer cluster policies enforce namespace quotas. I clarified that `ResourceQuota` and `LimitRange` are native Kubernetes objects enforced by the Kubernetes API server, not Portainer toggles.
- The original Portainer enforcement section was too broad. I updated it to reflect that reusable policies are a Portainer Business Edition feature for Edge (Standard) Agent environments on Portainer 2.37.0+ and that pod security constraints are enforced through OPA Gatekeeper.

## Review Notes
Portainer's current documentation distinguishes between per-environment cluster configuration pages and centralized reusable policies. The Kubernetes YAML and `kubectl` examples in the post were otherwise valid after that Portainer-specific framing was corrected.
