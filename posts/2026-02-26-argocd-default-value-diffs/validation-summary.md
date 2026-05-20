# Validation Summary: How to Handle Default Value Diffs in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes Deployments, Pods, Services, Ingresses, and CRDs
- GitOps diff customization
- YAML configuration
- kubectl and argocd CLI

## Sources Consulted
- Argo CD Diff Strategies: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes IPv4/IPv6 dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service Internal Traffic Policy documentation: https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The global Argo CD server-side diff ConfigMap example used `argocd-cm` with `server.diff.serverSideDiff`. Updated it to the documented `argocd-cmd-params-cm` setting `controller.diff.server.side: "true"` and added the required application controller restart note.
- The Ingress defaults section stated that `pathType` defaults to `ImplementationSpecific`. In `networking.k8s.io/v1`, each path must explicitly set `pathType`; paths without it fail validation. Updated the example to say the field is required.
- The CRD defaulting example omitted required `apiextensions.k8s.io/v1` CRD fields such as `group`, `scope`, `names`, `served`, and `storage`. Added the required fields so the example is structurally valid.
- The debugging commands included `argocd app set my-app --plugin-env 'ARGOCD_APP_PARAMETERS=[]'`, which is unrelated to enabling server-side diff. Replaced it with the documented `argocd app diff my-app --server-side-diff` command and added `--overwrite` to the temporary annotation command.

## Review Notes
Server-side diff is stable in current Argo CD documentation and is the appropriate recommendation for defaulting-related diff noise. The post should still be read with version awareness because Kubernetes defaulting behavior can vary by API version, feature gate, and cluster networking configuration.
