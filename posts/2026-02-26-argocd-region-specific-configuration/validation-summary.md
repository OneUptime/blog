# Validation Summary: How to Handle Region-Specific Configuration with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSet cluster and merge generators
- Argo CD Config Management Plugins
- Argo CD Notifications webhooks
- Kustomize overlays, patches, and ConfigMap generators
- Helm values files and inline values
- Kubernetes manifests
- GitHub Actions
- kubectl
- yq
- AWS Systems Manager Parameter Store

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Notifications template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubectl generated command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- yq eval-all documentation: https://mikefarah.gitbook.io/yq/commands/evaluate-all

## Issues Found
- The base Kustomize example used `commonLabels`, which recent Kustomize versions warn is deprecated. Updated it to the current `labels` list form with `includeSelectors: true` to preserve the old selector-labeling behavior.
- The ApplicationSet example declared cluster-generator `values` but did not reference them with the required `.values.<name>` prefix, and the separate cluster generators could generate duplicate Applications for the same cluster. Reworked the example to use a merge generator keyed by `server`, enabled Go templating, and rendered the values into Helm inline values.
- The Config Management Plugin example used the legacy `argocd-cm` `configManagementPlugins` configuration, which Argo CD deprecated in v2.4 and removed in v2.8. Updated it to a sidecar-mounted `plugin.yaml` ConfigMap using `kind: ConfigManagementPlugin`.
- The CMP example parsed `ARGOCD_APP_PARAMETERS` as an object field, but Argo CD exposes plugin parameters as a JSON array of parameter objects. Updated the `jq` expression to select the `region` parameter by name.
- The CI validation selected a ConfigMap named exactly `order-service-config`, but Kustomize-generated ConfigMaps get a hash suffix by default. Updated the yq selector to match ConfigMaps whose names start with `order-service-config`.

## Review Notes
- The example Helm and Kustomize snippets are structurally valid for current Argo CD and Kubernetes APIs, assuming the omitted chart templates, HPA base manifest, and patch files exist in the repository as shown.
- The Config Management Plugin snippet shows the plugin configuration ConfigMap only; a real deployment must also mount it into an `argocd-repo-server` sidecar that runs `/var/run/argocd/argocd-cmp-server`.
