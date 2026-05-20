# Validation Summary: How to Restrict Application Namespaces in ArgoCD

## Status
validated

## Post Type
Tutorial / Security configuration guide

## Technologies Covered
- Argo CD Applications in any namespace
- Argo CD AppProjects
- Argo CD RBAC
- Kubernetes RBAC
- OPA Gatekeeper admission control
- kubectl and jq auditing commands

## Sources Consulted
- Argo CD Applications in any namespace: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/app-any-namespace/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD argocd-cmd-params-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- The default project section incorrectly described `sourceNamespaces` as the way to restrict the default project to the `argocd` namespace. Argo CD allows Applications in the control-plane namespace to reference projects for backwards compatibility, while `sourceNamespaces` controls additional Application namespaces. Updated the examples to use `sourceNamespaces: []` and to emphasize not granting tenant namespaces to the default project.
- The Argo CD RBAC examples used `<project>/<application>` style object paths. With Applications in any namespace enabled, Argo CD expects `<project>/<namespace>/<application>`. Updated the team policies to use `team-frontend/team-frontend/*` and `team-backend/team-backend/*`.
- The Kubernetes RBAC section suggested an explicit deny Role with `verbs: []` and mentioned NetworkPolicy as a way to prevent Application creation. Kubernetes RBAC is allow-only and NetworkPolicy does not control Kubernetes API authorization. Replaced that snippet with guidance to avoid granting Application permissions and verify with `kubectl auth can-i`.

## Review Notes
- The Argo CD namespace allow-list, AppProject `sourceNamespaces`, source repository, destination, and resource whitelist examples align with the official Argo CD documentation.
- The Gatekeeper ConstraintTemplate uses legacy Rego placement under `targets[].rego`, which is still documented, while newer Gatekeeper versions also support the `targets[].code[]` form for Rego v1.
