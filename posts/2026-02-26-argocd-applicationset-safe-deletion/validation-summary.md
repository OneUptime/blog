# Validation Summary: How to Handle ApplicationSet Deletion Safely in ArgoCD

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes owner references and finalizers
- Kubernetes `kubectl delete` and `kubectl patch`
- Kubernetes ValidatingWebhookConfiguration
- Argo CD RBAC
- Bash and `jq`

## Sources Consulted
- Argo CD ApplicationSet Application Pruning & Resource Deletion: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD ApplicationSet Controlling Resource Modification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/

## Issues Found
1. **Incorrect claim that `applicationsSync: create-only` preserves Applications when deleting an ApplicationSet**: Argo CD documentation states that `create-only` and `create-update` do not prevent deletion caused by Kubernetes owner references when the ApplicationSet itself is deleted. Replaced this strategy with `kubectl delete applicationset my-apps -n argocd --cascade=orphan`, which is the documented way to orphan generated Applications during ApplicationSet deletion.
2. **Incorrect advance-planning field**: The post used `applicationsSync: create-only` and a `preservedFields` heading for preserving deletion behavior. Updated the section to use `syncPolicy.preserveResourcesOnDeletion: true`, which prevents the ApplicationSet controller from adding the Argo CD resource finalizer to generated Applications and preserves deployed Kubernetes resources when those Applications are deleted.
3. **Inaccurate diagram label**: The deletion-chain diagram grouped `create-only/create-update` as preserving Applications on ApplicationSet deletion. Updated it to show `--cascade=orphan` as the preservation path.
4. **Potentially unreliable generated-Application listing**: The post listed generated Applications using an unsupported/non-authoritative `app.kubernetes.io/managed-by=applicationset-controller` label. Updated the command to select Applications by `metadata.ownerReferences`, matching the documented relationship between ApplicationSets and generated Applications.
5. **Brittle patch commands**: JSON Patch `remove` operations fail if `metadata.finalizers` or `metadata.ownerReferences` is absent. Updated those examples to use merge patches that set the fields to `null`, making the commands safe to run when the fields are absent.

## Review Notes
- The default deletion-chain explanation is accurate for ApplicationSets whose generated Applications include `resources-finalizer.argocd.argoproj.io`, which is the default unless `syncPolicy.preserveResourcesOnDeletion: true` is set.
- The RBAC example uses the current `applicationsets` Argo CD RBAC resource and supported `get`, `create`, `update`, and `delete` actions.
- The validating webhook snippet uses the current `admissionregistration.k8s.io/v1` API and valid `DELETE` admission operation.
