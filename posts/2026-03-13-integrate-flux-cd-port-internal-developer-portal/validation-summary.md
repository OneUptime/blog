# Validation Summary: How to Integrate Flux CD with Port Internal Developer Portal

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Flux CD v2
- Kubernetes custom resources
- Flux `Kustomization`
- Flux `HelmRelease`
- Port Kubernetes exporter
- Port blueprints, relations, self-service actions, and scorecards
- Helm chart deployment through Flux

## Sources Consulted
- Port Kubernetes integration documentation: https://docs.port.io/build-your-software-catalog/sync-data-to-catalog/kubernetes-stack/kubernetes/
- Port Kubernetes exporter advanced configuration: https://docs.port.io/build-your-software-catalog/sync-data-to-catalog/kubernetes-stack/kubernetes/advanced/
- Port self-service actions documentation: https://docs.port.io/actions-and-automations/create-self-service-experiences/
- Port webhook backend documentation: https://docs.port.io/actions-and-automations/setup-backend/webhook/
- Port blueprint setup documentation: https://docs.port.io/build-your-software-catalog/customize-integrations/configure-data-model/setup-blueprint/
- Port scorecard concepts and structure: https://docs.port.io/scorecards/concepts-and-structure/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Port Kubernetes exporter Helm chart listing: https://artifacthub.io/packages/helm/port-labs/port-k8s-exporter

## Issues Found
- The Kubernetes exporter Helm values used `configMap.config` as a nested YAML object. Port documents Helm-managed exporter mappings as a block string under `configMap.config`, so I changed it to `config: |` and added `overwriteConfigurationOnRestart: true` for GitOps-managed mappings.
- The Kustomization selector query ended with `or true`, making the filter always match. I changed it to exclude only the `flux-system` namespace as intended.
- The Flux Kustomization entity did not store the raw Kubernetes resource name, but the action examples sent `.entity.identifier`, which included both namespace and name. I added a `name` property to the mapping and blueprint, then changed action payloads to use `.entity.properties.name`.
- The HelmRelease mapping used `.status.lastAppliedRevision`, which is a Kustomization status field, not a HelmRelease v2 status field. I changed it to `.status.lastAttemptedRevision`.
- The Port blueprint used the `GitOps` icon, which is not in Port's documented icon list. I changed it to the documented `Fluxcd` icon.
- The JSON examples included `//` comments, which made them invalid JSON. I removed the comments from the fenced JSON examples.
- The Port secret template used `{{ secrets.PLATFORM_API_TOKEN }}`. Port documents secrets as `{{ .secrets.SECRET_NAME }}`, so I changed it to `{{ .secrets.PLATFORM_API_TOKEN }}`.
- The relation mapping example used an unsupported nested `value` key. Port exporter examples map relation names directly to JQ expressions, so I changed it to `service: .metadata.labels["port.io/entity-identifier"]`.
- The Kustomization label example included `port.io/blueprint: service`, which was not used by the exporter relation mapping and could imply the Flux object itself should be ingested as a service. I removed it.
- The scorecard example had a Basic-level rule and a `relatedTo` operator. Port documents Basic as the default level and lists scorecard rule operators for property checks, not `relatedTo`. I changed the scorecard to be created for the `fluxKustomization` blueprint and kept property-based health rules.
- The best-practices section recommended Port `ttl` for deleted Flux resources. Port's Kubernetes exporter documents `stateKey` for stale entity deletion tracking, so I added a stable `stateKey` to the Helm values and updated the best-practice note.

## Review Notes
- The HelmRelease assumes a `HelmRepository` named `port` exists in `flux-system`; the post does not include that repository manifest. This is acceptable as an environment-specific prerequisite, but a future expansion could include the repository definition.
- The post provides a blueprint for `fluxKustomization` only. A future expansion could add a matching `fluxHelmRelease` blueprint for the HelmRelease mapping.
