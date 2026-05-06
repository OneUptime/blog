# Validation Summary: How to Configure Cluster-Level Policies in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Projects and project resource quotas
- Rancher Fleet
- Kubernetes Pod Security Admission / Pod Security Standards
- Kubernetes NetworkPolicy
- OPA Gatekeeper
- SUSE Rancher compliance scans

## Sources Consulted
- Rancher: How Resource Quotas Work in Rancher Projects - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher API Workflows: Projects - https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher Fleet Overview - https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Kubernetes: Pod Security Admission - https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes: Enforce Pod Security Standards with Namespace Labels - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes: Enforce Pod Security Standards by Configuring the Built-in Admission Controller - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes: kubectl label reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Gatekeeper: Installation - https://open-policy-agent.github.io/gatekeeper/website/docs/next/install/
- Gatekeeper: Constraint Templates - https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper: Handling Constraint Violations - https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper Library: Required Resources - https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerresources/
- SUSE Rancher Manager: Compliance Scans - https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/security/compliance-scans/compliance-scans.html

## Issues Found
- The Rancher Project manifest omitted `spec.clusterName`, which Rancher's API workflow documentation includes when creating projects. I added `clusterName: c-xxxxx`.
- The resource quota explanation described Rancher project quotas as cluster-level. Rancher documents them as project quotas that propagate to namespaces, so I corrected the wording to project-wide.
- The Pod Security Standards section said `kubectl label namespace --all` sets the cluster's default policy. Namespace labels apply only to labeled namespaces; cluster-wide defaults are configured through the Pod Security admission controller. I corrected the wording to "label existing namespaces" and updated the commands to use `--overwrite` in line with the official examples.
- The NetworkPolicy section used a default-deny policy for both ingress and egress, but the follow-up example only allowed backend ingress. Under egress isolation, frontend pods would still be blocked from sending traffic. I replaced the single allow policy with paired frontend egress and backend ingress policies and made the per-namespace scope explicit.
- The Gatekeeper section said the template required resource limits on all containers, but the Rego only checked `spec.containers[].resources.limits.cpu`. I corrected the description to match the actual policy.
- The Gatekeeper `templates.gatekeeper.sh/v1` ConstraintTemplate did not include a structural validation schema. I added a minimal `openAPIV3Schema` object schema to keep the example aligned with Gatekeeper's `v1` template requirements.
- The best-practices section referred to Rancher's "CIS benchmark scanner". Current Rancher documentation uses the "compliance scans" feature name, so I updated that terminology while preserving the CIS posture guidance.

## Review Notes
- `pod-security.kubernetes.io/enforce-version=latest` is valid, but pinning to a specific Kubernetes minor version gives more predictable behavior across cluster upgrades.
- NetworkPolicies are enforced only when the cluster's CNI plugin implements NetworkPolicy.
- The Gatekeeper example checks regular Pod containers in `spec.containers`. If the intent is to cover `initContainers` or other resource fields such as memory, the policy would need to be extended.
