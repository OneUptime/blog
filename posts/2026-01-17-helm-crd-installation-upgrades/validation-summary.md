# Validation Summary: How to Handle Helm CRD Installation and Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm
- Kubernetes CustomResourceDefinitions
- kubectl
- GitHub Actions
- Argo CD
- Kubernetes admission webhooks

## Sources Consulted
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Helm chart hooks lifecycle: https://helm.sh/docs/topics/charts_hooks/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Helm template command reference: https://helm.sh/docs/helm/helm_template/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes CRD versioning and conversion webhook documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/

## Issues Found
- The Helm install operation order incorrectly said templates are applied before hooks execute. Updated the comments to match Helm's lifecycle: CRDs are installed, templates are rendered, pre-install hooks run, rendered resources are applied, then post-install hooks run.
- The manual upgrade example used `helm upgrade ... --skip-crds`, but Helm documents `--skip-crds` for upgrade as relevant when `--install` is enabled. Updated the command to `helm upgrade --install ... --skip-crds`.
- The separate CRD chart example put CRDs in `templates/crds.yaml` using `.Files.Glob "crds/*.yaml"`, which conflicts with Helm's documented special handling of the `crds/` directory. Replaced it with a direct `charts/myapp-crds/crds/myresource-crd.yaml` example.
- The conversion webhook CRD example used Helm template expressions inside a file under `crds/`, but Helm does not template CRDs in the `crds/` directory. Replaced the templated namespace and CA bundle with literal example values.
- The wrap-up implied that a separate CRD chart by itself ensures reliable CRD upgrades. Updated it to clarify that a separate chart helps with installation ordering, while manual CRD management is the reliable upgrade path when using Helm's `crds/` handling.
- The `helm.sh/resource-policy: keep` guidance implied it is always required for CRDs. Updated the affected examples and wrap-up to clarify this applies to templated CRDs; Helm's `crds/` CRDs are not upgraded or deleted by Helm.

## Review Notes
The pre-upgrade hook pattern is technically possible but operationally complex because hook-created resources, RBAC, ConfigMaps, CRD size limits, and Helm release storage limits need careful handling. For most teams, the simpler and safer approach remains managing CRDs separately with `kubectl apply` or using a dedicated CRD chart installed before the main chart.
