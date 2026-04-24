# Validation Summary: How to Configure Kubernetes Cluster Policies in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes
- ResourceQuota
- LimitRange
- PodDisruptionBudget
- NetworkPolicy
- OPA Gatekeeper
- `kubectl`
- `jq`

## Sources Consulted
- Portainer Documentation: Setup — https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer Documentation: Security constraints — https://docs.portainer.io/user/kubernetes/cluster/security
- Portainer Documentation: Policies overview — https://docs.portainer.io/admin/environments/policies
- Portainer Documentation: Kubernetes setup policies — https://docs.portainer.io/sts/admin/environments/policies/kubernetes-policies/kubernetes-setup-policy
- Kubernetes Documentation: Resource Quotas — https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Documentation: Limit Ranges — https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Documentation: Specifying a Disruption Budget for your Application — https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Documentation: Network Policies — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Gatekeeper Library: Required Resources — https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerresources/
- Gatekeeper GitHub releases — https://github.com/open-policy-agent/gatekeeper/releases

## Issues Found
1. **Portainer navigation and feature placement were incorrect.** The post said to use **Settings → Cluster** and treated several controls as one screen. Updated it to the documented paths: **Cluster → Setup**, **Cluster → Security constraints**, and **Cluster → Policies**, with policy editing under **Environment-related → Policies**.
2. **The listed Portainer deployment options did not match current documented options.** Replaced unsupported items such as "Allow Helm charts", "Allow use of node ports", and "Require resources on namespaces" with the documented deployment controls for code-based deployment, web editor/custom templates, and manifest URL deployment. Moved privileged-container enforcement to the documented **Security constraints** section.
3. **The resource quota section incorrectly claimed Portainer sets default quotas for new namespaces.** Portainer documents namespace-level resource assignment, not automatic default `ResourceQuota` injection for newly created namespaces. Updated the text to describe applying a standard namespace `ResourceQuota`.
4. **The network policy section overstated the behavior as a default for new namespaces.** Updated the wording to describe applying `NetworkPolicy` objects per namespace and noted that enforcement depends on a CNI that supports `NetworkPolicy`.
5. **The Gatekeeper example was incomplete and version-pinned to an outdated release branch.** The original constraint would not work without first installing the `K8sRequiredResources` `ConstraintTemplate`. Added the required template installation step and updated the Gatekeeper install command to the current stable release `v3.22.1` as of April 24, 2026.
6. **The Gatekeeper example text did not match the constraint parameters.** The prose said it enforced limits only, but the manifest enforced both CPU/memory `limits` and `requests`. Updated the explanation to match the actual constraint.
7. **The resource-limit compliance `jq` command could emit duplicate pod names.** Rewrote it to use `any(...)` so each non-compliant pod is reported once even when multiple containers are missing limits.
8. **The "pods running as root" check was not technically accurate.** The original command only looked at container-level `runAsNonRoot`, ignored pod-level defaults, and could flag pods that do enforce non-root execution. Updated it to check effective `runAsNonRoot` enforcement from either container or pod security context and changed the description accordingly.
9. **The default namespace description overstated Portainer's behavior.** The original text said it prevents deployments to `default`; the docs say it restricts access to admins and explicitly granted users. Updated the explanation to match.
10. **The resource over-commit explanation was imprecise.** Updated it to reflect Portainer's documented behavior around namespace allocation rather than implying a direct hard cap on summed pod requests at the Kubernetes scheduler level.

## Review Notes
- The post now correctly separates Portainer-managed controls from Kubernetes-native policy objects. Readers should still note that `ResourceQuota`, `LimitRange`, `PodDisruptionBudget`, and `NetworkPolicy` are Kubernetes resources, not Portainer-only abstractions.
- Portainer's centralized policy-based management is version- and environment-dependent. The official docs state policies can only be created in Portainer BE and applied to supported Edge Standard Agent environments.
- The Gatekeeper `ConstraintTemplate` install command follows the Gatekeeper Library usage shown in the official docs and currently references the library's `master` branch.
