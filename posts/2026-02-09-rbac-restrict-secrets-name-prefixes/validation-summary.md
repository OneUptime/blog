# Validation Summary: How to Use RBAC to Restrict Access to Kubernetes Secrets Based on Name Prefixes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Secrets
- Kubernetes ServiceAccounts, Roles, and RoleBindings
- kubectl
- jq

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post described RBAC resourceNames as supporting prefixes or naming patterns. Kubernetes resourceNames are exact names only, so the description, introduction, resourceNames explanation, and conclusion were updated to state exact-name matching.
- Several examples granted list and watch together with resourceNames in a way that implied broad prefix-based discovery. Kubernetes requires metadata.name field selectors when list or watch is restricted by resourceNames, and list on secrets returns full Secret data. Those examples were changed to use get only, and the dynamic example now warns against granting list unless the subject should see all returned Secret data.
- The TLS Secret example used placeholder values with ellipses, which are not valid base64. The values were replaced with valid base64 placeholders while keeping the required tls.crt and tls.key keys.
- The environment-specific example created ServiceAccounts and Roles but no RoleBindings, so it would not actually grant access. RoleBindings were added for the dev and prod ServiceAccounts.
- The audit command attempted to execute kubectl inside a jq filter, which cannot work. It was replaced with a shell loop that reads RoleBindings, fetches the referenced Roles, and uses jq to test whether the Role grants access to the target Secret.
- The label/admission webhook section incorrectly suggested that an admission webhook could validate Secret GET access. Kubernetes admission controllers do not handle read requests such as get, list, or watch, so the section was changed to describe label-driven automation that generates exact resourceNames.
- The test commands created resources in the test namespace without creating the namespace first. A namespace creation command was added.

## Review Notes
kubectl is not installed in this workspace, so commands could not be dry-run locally. CLI behavior was checked against the official Kubernetes kubectl reference, and the revised jq predicate was syntax-checked locally with jq.
