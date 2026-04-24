# Validation Summary: How to Configure Cluster-Level Policies in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Fleet
- Kubernetes
- OPA Gatekeeper
- Gatekeeper Library
- Pod Security Standards
- NetworkPolicy
- ResourceQuota
- LimitRange

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet GitRepo resource: https://fleet.rancher.io/ref-gitrepo
- Fleet source for bundle and Helm deployment behavior: https://github.com/rancher/fleet/blob/master/pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go
- Fleet source for Helm release namespace handling: https://github.com/rancher/fleet/blob/master/internal/helmdeployer/deployer.go
- Gatekeeper ConstraintTemplates: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper audit: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper enforcement actions: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.15.x/violations/
- Gatekeeper Library Required Labels: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredlabels/
- Gatekeeper Library Privileged Container: https://open-policy-agent.github.io/gatekeeper-library/website/validation/privileged-containers/
- Gatekeeper Library Allowed Repositories: https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedrepos/
- Kubernetes Pod Security Standards namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes Pod Security Standards guidance: https://kubernetes.io/docs/setup/best-practices/enforcing-pod-security-standards/
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange: https://kubernetes.io/docs/concepts/policy/limit-range/
- Rancher OPA Gatekeeper integration note: https://ranchermanager.docs.rancher.com/v2.8/integrations-in-rancher/opa-gatekeeper

## Issues Found
- The Fleet installation example used a `helm.cattle.io/v1` `HelmChart` resource. That CRD belongs to the Helm controller and is not Fleet’s portable Helm bundle format, so it would not be the correct mechanism for a general Rancher Fleet workflow. I replaced it with a valid `gatekeeper/fleet.yaml` example using Fleet’s official `helm` configuration and `defaultNamespace`.
- The custom `ConstraintTemplate` used `templates.gatekeeper.sh/v1` but defined `spec.crd.spec.validation` incorrectly. In Gatekeeper `v1`, the parameters schema must be declared under `openAPIV3Schema` and must be structural. I corrected the schema so the template is valid.
- The `K8sPSPPrivilegedContainer` and `K8sAllowedRepos` constraints assumed their matching Gatekeeper Library templates already existed. Upstream Gatekeeper does not install those templates automatically. I added the required template installation commands so the later constraints have the CRDs they depend on.
- The Pod Security Standards example omitted `warn-version` and `audit-version`, and the bulk-label command only applied a partial label set without `--overwrite` while also missing several common system namespaces. I updated the manifest and command so they align with the Kubernetes guidance more closely.
- The `allow-same-namespace` NetworkPolicy only allowed ingress. Because the namespace was also under default-deny egress, same-namespace traffic would still be blocked unless egress was explicitly allowed too. I updated the policy to allow both ingress and egress within the namespace and added the standard CNI caveat.
- The audit section queried `ConstraintTemplate` objects for violation totals, but Gatekeeper audit violations are reported on constraints. I corrected the commands to inspect constraint status directly and made the `describe` example explicit about the constraint kind being queried.

## Review Notes
- Rancher’s older built-in OPA Gatekeeper integration is deprecated in Rancher documentation, and newer Rancher releases emphasize Kubewarden. This post remains technically usable because it deploys upstream Gatekeeper through Fleet rather than depending on Rancher’s older built-in integration flow.
- The `K8sAllowedRepos` example is valid for prefix matching, but the Gatekeeper Library also provides `K8sAllowedReposv2` when exact matches or wildcard-style patterns are preferred.
- NetworkPolicy examples only take effect when the cluster’s CNI plugin enforces NetworkPolicy.
