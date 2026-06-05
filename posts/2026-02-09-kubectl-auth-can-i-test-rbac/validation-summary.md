# Validation Summary: How to Use kubectl auth can-i to Test RBAC Permissions Before Deploying

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes RBAC
- Kubernetes authorization APIs
- kubectl plugins and Krew

## Sources Consulted
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes SubjectAccessReview API reference: https://kubernetes.io/docs/reference/kubernetes-api/definitions/subject-access-review-v1-authorization/
- Kubernetes kubectl create rolebinding reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_rolebinding/
- Kubernetes SIGs Krew repository: https://github.com/kubernetes-sigs/krew
- rbac-tool repository documentation: https://github.com/alcideio/rbac-tool

## Issues Found
- Subresource examples used `pods/log`, `pods/exec`, `pods/portforward`, `deployments/scale`, and `services/proxy` as resource arguments. Current `kubectl auth can-i` documentation shows subresource checks using `--subresource`, so these commands were updated to use the documented flag.
- The all-namespace section described every example as cluster-wide. `--all-namespaces` checks the action in all namespaces for namespaced resources, while namespaces, nodes, and cluster roles are cluster-scoped resources. The wording was adjusted to distinguish these cases.
- The listing section implied that `can-i` only checks specific permissions and relied on `rbac-tool` for listing. Current kubectl supports `kubectl auth can-i --list`, so native listing examples were added and the `rbac-tool` description was narrowed to additional RBAC analysis and role binding lookup.
- The admission controller section implied admission webhooks should use `kubectl auth can-i` directly. The wording was corrected to reference the SubjectAccessReview API, which is the Kubernetes API intended for delegated authorization decisions.
- The denial debugging section claimed verbose output reveals evaluated RBAC rules and suggested grepping kubeconfig for a service account. Verbose kubectl output can show request and response details, but not necessarily evaluated RBAC rules. The kubeconfig check was changed to show the active context and user.

## Review Notes
The local environment did not have `kubectl` installed, so command verification used the current official Kubernetes documentation rather than local `kubectl --help` output.
