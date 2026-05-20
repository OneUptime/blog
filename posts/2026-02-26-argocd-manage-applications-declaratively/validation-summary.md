# Validation Summary: How to Manage ArgoCD Applications Declaratively

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Kubernetes custom resources
- GitOps
- Helm
- Kustomize
- kubectl
- Argo CD CLI
- YAML

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app manifests` Command Reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app create` Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD Notification Subscriptions: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/notifications/subscriptions/
- Argo CD Annotations and Labels: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Kubernetes `kubectl apply` Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The finalizer guidance said to always include finalizers. Argo CD documentation states the resources finalizer should be added when cascading deletion of managed resources is desired. Updated the best practice to make that condition explicit.
- The initial finalizer comment said it ensures cleanup on deletion. Updated the wording to say it enables cascading cleanup, which more accurately describes Argo CD behavior.
- The secrets section implied Application manifests may contain repository credentials. Argo CD stores repository credentials separately, while Application specs reference repository URLs. Updated the wording to clarify that credentials should not be embedded in Application manifests.
- The validation section implied all commands are used before applying the Application. `argocd app manifests APPNAME` prints manifests for an existing application. Updated the wording and command comments to distinguish pre-apply `kubectl` dry runs from post-create Argo CD manifest previewing.

## Review Notes
The Application, Helm, Kustomize, multi-source, sync policy, label, annotation, and kubectl examples match current Argo CD and Kubernetes documentation. The ingress-nginx chart version shown is an illustrative pinned version rather than a recommendation to deploy that exact chart version.
