# Validation Summary: How to Install ArgoCD Using Kustomize

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- Kustomize
- GitOps
- Kubernetes YAML manifests

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD 2.13 declarative setup documentation: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/declarative-setup/
- Argo CD 2.13 command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD OIDC/user management documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD notifications documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes kubectl apply reference: https://v1-35.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Argo CD v2.13.3 install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
- Argo CD v2.13.3 notifications catalog manifest: https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/notifications_catalog/install.yaml

## Issues Found
- The dev repository example used the legacy `repositories` key in `argocd-cm`. In Argo CD 2.13, repository definitions in `argocd-cm` are deprecated, so the example was changed to a supported repository Secret with the `argocd.argoproj.io/secret-type: repository` label.
- The production command parameters used `reposerver.default.timeout`, which is not a documented Argo CD 2.13 `argocd-cmd-params-cm` key. It was changed to `reposerver.git.request.timeout: "180s"`.
- The notifications component referenced `manifests/notifications/install.yaml`, which returns 404 for Argo CD v2.13.3. It was changed to the valid `notifications_catalog/install.yaml` path.
- The Dex image override used `v2.38.0`, while the Argo CD v2.13.3 install manifest uses `ghcr.io/dexidp/dex:v2.41.1`. The override example was updated to `v2.41.1`.

## Review Notes
The YAML snippets were parsed successfully after the fixes. `kubectl` was not installed in the local environment, so CLI command validation was performed against Kubernetes command reference documentation rather than local `kubectl --help` output.
