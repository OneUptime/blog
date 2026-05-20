# Validation Summary: How to Debug Kustomize Build Errors in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes
- kubectl
- GitHub Actions
- YAML

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get-resource` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get-resource/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes SIGs Kustomize releases: https://github.com/kubernetes-sigs/kustomize/releases

## Issues Found
- The post used `argocd app diff my-app --resource ':Deployment:my-api'`, but the current Argo CD `app diff` command reference does not document a `--resource` option. Changed the example to `argocd app get-resource my-app --kind Deployment --resource-name my-api -o yaml`, which is a documented way to inspect a specific live application resource.
- The `no matches for kind` explanation said a CRD is referenced but not installed as if this were a Kustomize build failure. Kustomize does not normally query the cluster during a plain build, so this was reworded to describe the Argo CD diff or sync case where the cluster API resource is not found.
- The repo-server exec example used `bash`. Changed it to `sh` because Argo CD container images are not guaranteed to include Bash, while `sh` is the safer generic shell example.
- The Kustomize version workaround suggested `vars` instead of `replacements` for older versions without caveat. Added that `vars` is deprecated in newer Kustomize releases.

## Review Notes
The Argo CD `kustomize.buildOptions` examples for `--load-restrictor LoadRestrictionsNone` and `--enable-helm`, the `argocd app get --hard-refresh` usage, and the `kubectl logs` flags were consistent with official documentation. The CI workflow pins Kustomize v5.3.0, which is valid but not the latest Kustomize release as of this review.
