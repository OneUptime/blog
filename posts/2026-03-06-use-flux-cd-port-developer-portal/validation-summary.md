# Validation Summary: How to Use Flux CD with Port Developer Portal

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Flux CD
- Port Developer Portal
- Port Kubernetes exporter
- Kubernetes
- Helm and Flux HelmRelease
- Kubernetes custom resources and RBAC
- JQ-based integration mappings

## Sources Consulted
- Port Kubernetes exporter documentation: https://docs.port.io/build-your-software-catalog/sync-data-to-catalog/kubernetes-stack/kubernetes/
- Port Kubernetes exporter advanced configuration: https://docs.port.io/build-your-software-catalog/sync-data-to-catalog/kubernetes-stack/kubernetes/advanced/
- Port FluxCD template documentation: https://docs.port.io/build-your-software-catalog/sync-data-to-catalog/kubernetes-stack/kubernetes/templates/fluxcd/
- Port mapping configuration documentation: https://docs.port.io/build-your-software-catalog/customize-integrations/configure-mapping/
- Port Kubernetes exporter Helm chart values and templates: https://github.com/port-labs/helm-charts/tree/main/charts/port-k8s-exporter
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/

## Issues Found
- The Port exporter Helm values used `secret.existingSecret`, which is not the current chart value. Changed it to `secret.useExistingSecret: true` and `secret.name: port-credentials`.
- The resource mapping was placed directly under `values.resources`, but the current exporter chart reads declarative mapping from `configMap.config` when managed by Helm/GitOps. Moved the mapping under `configMap.config` and enabled `overwriteConfigurationOnRestart`.
- The Kubernetes exporter resource kinds used singular Kind-style values such as `source.toolkit.fluxcd.io/v1/GitRepository`. Port's Kubernetes exporter expects group/version/resource form, so these were changed to plural resource names such as `source.toolkit.fluxcd.io/v1/gitrepositories`.
- The post defined a Flux namespace blueprint but did not map namespaces into Port, so namespace relations could not resolve. Added a `v1/namespaces` mapping.
- Namespace relation expressions were quoted as string literals instead of reading `.metadata.namespace`. Updated the JQ relations to use actual namespace values and include `CLUSTER_NAME` for stable cross-cluster identifiers.
- Several JQ condition lookups used `.status.conditions[]`, which can fail or emit no value when conditions are absent. Replaced them with null-safe `any(.status.conditions[]?; ...)` and list/`first` expressions.
- The GitRepository branch mapping only handled `.spec.ref.branch`. Updated it to fall back to tag, semver, or name references.
- The HelmRelease mapping used `.status.lastAppliedRevision`, which is not a HelmRelease v2 status field. Updated the mapping to use `.status.lastAttemptedRevision` and current HelmRelease history fields where applicable.
- The Flux Receiver example attempted to reconcile `Kustomization` and `HelmRelease` wildcard resources without label selectors. Flux documentation recommends webhooks reconcile source resources and let downstream Kustomizations and HelmReleases reconcile from source changes. Updated the example to target a `GitRepository` source resource.
- The Receiver comment described the generic receiver secret as webhook authentication. Flux's generic receiver uses the token to generate the webhook path, so the comment was corrected.

## Review Notes
The post is technically relevant and remains a valid tutorial after the corrections. The self-service action examples are still illustrative rather than a complete end-to-end Port action implementation because the custom action handler image is a placeholder and no Port action JSON is defined.
