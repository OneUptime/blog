# Validation Summary: How to Handle CRD Deletion Impact on ArgoCD Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes custom resources and finalizers
- Argo CD Applications, pruning, sync options, resource exclusions, Helm rendering, and notifications
- Helm chart CRD lifecycle
- cert-manager Helm chart configuration
- Velero restores
- Kubernetes validating admission webhooks
- etcd snapshots and disaster recovery

## Sources Consulted
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions, https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes documentation: Finalizers, https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes documentation: Dynamic Admission Control, https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes documentation: Operating etcd clusters for Kubernetes, https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Argo CD documentation: Sync Options, https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD documentation: App Deletion, https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD documentation: Declarative Setup resource exclusions, https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD documentation: Helm, https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD documentation: Notifications triggers, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Expr language documentation: built-in collection functions, https://expr-lang.org/docs/v1.14/Language-Definition
- Helm documentation: Custom Resource Definitions best practices, https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- cert-manager v1.14 documentation: Helm installation, https://cert-manager.io/v1.14-docs/installation/helm/
- Velero documentation: Resource filtering, https://velero.io/docs/v1.17/resource-filtering/
- etcd documentation: Disaster recovery, https://etcd.io/docs/v3.7/op-guide/recovery/

## Issues Found
- The CRD deletion flow described the API server removing type registration before a garbage collector finds orphaned resources. Kubernetes documents CRD deletion as uninstalling the REST endpoint and deleting all custom objects stored for that CRD. Updated the Mermaid sequence to match that behavior and to note that finalizers may delay deletion.
- The Helm section implied Argo CD handles Helm CRDs with `--skip-crds` by default in some configurations and that Helm manages CRDs in the Argo CD example. Argo CD exposes `skipCrds: true` as an explicit option, and Helm's `crds/` directory behavior installs CRDs on first install but does not upgrade or delete them. Updated the wording and the cert-manager comment to avoid implying a Helm release manages those CRDs under Argo CD.
- The recovery section implied recreating a CRD could stop further damage without clarifying that deleted custom resources are not restored. Kubernetes documents that recreating the same CRD starts empty. Updated the recovery step to state that custom resources must be restored separately.
- The recovery section recommended checking live etcd for resources if no backup exists. Replaced that with guidance to restore from an etcd snapshot when available and to treat direct live etcd recovery as a last-resort administrator operation.
- The Argo CD notifications trigger used JSONPath-style `app.status.resources[*].kind`, which is not valid Argo CD notification expression syntax. Replaced it with the Expr `any(...)` collection function over `app.status.operationState.syncResult.resources`, with optional chaining for `operationState`.

## Review Notes
- The `installCRDs` value is accurate for the pinned cert-manager `v1.14.0` chart shown in the example. Current cert-manager documentation uses `crds.enabled=true` for newer releases, so this example should be revisited if the chart version is updated.
- The validating webhook snippet is structurally valid as an outline, but a production webhook also needs a working service, TLS serving certificate, and usually a `caBundle` or equivalent trust setup.
