# Validation Summary: How to Handle last-applied-configuration Annotation Diffs in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Server-side apply
- Server-side diff
- JSON Pointer
- Kubernetes RBAC
- OPA Gatekeeper

## Sources Consulted
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff strategies documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_tracking/
- Argo CD GitOps Engine diff package documentation: https://pkg.go.dev/github.com/argoproj/argo-cd/gitops-engine/pkg/diff
- Kubernetes declarative object management documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/
- Kubernetes kubectl apply command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl create command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- Kubernetes server-side apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- The post incorrectly stated that ArgoCD does not add the `kubectl.kubernetes.io/last-applied-configuration` annotation. Argo CD's default sync path uses client-side `kubectl apply`, which relies on that annotation. Updated the explanation to describe Argo CD's default client-side apply behavior and its separate resource tracking mechanism.
- The post overstated that the annotation commonly causes persistent false OutOfSync status. Updated the wording to focus on noisy diffs, stale or large annotations, and legacy three-way diff behavior.
- The server-side apply section said ArgoCD creates resources without the annotation and implied it eliminates all related problems. Updated it to say server-side apply avoids depending on the annotation for apply state and uses `kubectl apply --server-side --force-conflicts`.
- The server-side diff section claimed neither side includes the annotation. Updated it to the documented behavior: server-side diff compares a server-side dry-run result against live state and avoids relying on the last-applied annotation.
- The RBAC example claimed Kubernetes RBAC could prevent only `kubectl apply` on ArgoCD-managed resources. RBAC cannot distinguish apply from other create, update, or patch operations. Updated the text and role name to describe removing direct write permissions.
- The Gatekeeper example used a non-standard `app.kubernetes.io/managed-by=argocd` label and omitted the structural schema required for `templates.gatekeeper.sh/v1`. Updated it to check Argo CD's default `app.kubernetes.io/instance` tracking label and added `validation.openAPIV3Schema.type: object`.
- The Gatekeeper example showed only a `ConstraintTemplate`, which does not enforce a policy by itself. Added a matching `PreventDirectApply` constraint.
- The CI/CD section recommended `kubectl create --save-config=false` too broadly after discussing `kubectl apply`. Updated the wording to clarify it only applies when creating a new resource.

## Review Notes
The JSON Pointer examples and Argo CD `ignoreDifferences` fields are valid. The post is accurate after the fixes, but a future improvement would be to add a concrete reproduced diff example so readers can distinguish annotation-value noise from other Argo CD diff causes.
