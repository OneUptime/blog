# Validation Summary: How to Implement Admission Policies for ArgoCD-Managed Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes admission control
- Kubernetes ValidatingAdmissionPolicy
- Kyverno ClusterPolicy
- OPA Gatekeeper
- Server-Side Apply
- kubectl and jq

## Sources Consulted
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes ValidatingAdmissionPolicy GA announcement: https://kubernetes.io/blog/2024/04/24/validating-admission-policy-ga/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD custom health checks documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno preconditions documentation: https://kyverno.io/docs/policy-types/cluster-policy/preconditions/
- Kyverno JMESPath documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper constraint violation and enforcement action documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Linked OneUptime post: https://oneuptime.com/blog/post/2026-02-26-how-to-audit-policy-compliance-with-argocd/view

## Issues Found
- The post stated that ValidatingAdmissionPolicy was GA starting in Kubernetes 1.28. Updated this to say it became beta in Kubernetes 1.28 and GA in Kubernetes 1.30.
- Several Kyverno examples used the deprecated top-level `spec.validationFailureAction` field. Moved the action to `spec.rules[*].validate.failureAction`, which is the current Kyverno form.
- The Argo CD Server-Side Apply example listed `ServerSideApply=true` twice and described the duplicate entry as conflict resolution. Removed the duplicate and clarified that Argo CD uses `kubectl apply --server-side --force-conflicts` for this sync option.
- The Gatekeeper namespace exemption example used an incomplete Helm values shape. Replaced it with a Gatekeeper `Config` resource that excludes the namespaces from Gatekeeper processes.
- The NetworkPolicy requirement claimed to ensure every namespace had a NetworkPolicy, but the policy actually evaluates Deployments. Updated the wording to say it requires a NetworkPolicy before accepting workload deployments.
- The PodDisruptionBudget Kyverno example compared selector maps directly and did not handle omitted Deployment replica counts. Updated it to default omitted replicas to `1` and use Kyverno's `label_match` helper against pod template labels.
- The LoadBalancer restriction used a negated pattern on `spec.type`, which can fail when `spec.type` is omitted. Replaced it with a deny condition that treats an omitted type as `ClusterIP` and only blocks explicit `LoadBalancer` services.

## Review Notes
The remaining examples are illustrative and assume the relevant CRDs, API permissions, and policy controllers are installed. The Gatekeeper `Config` resource is alpha in Gatekeeper documentation, so teams may prefer per-constraint exclusions or the `controllerManager.exemptNamespaces` plus namespace label flow depending on their operational model.
