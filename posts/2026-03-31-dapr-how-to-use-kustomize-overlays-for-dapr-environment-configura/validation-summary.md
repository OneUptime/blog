# Validation Summary: How to Use Kustomize Overlays for Dapr Environment Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Components, Resiliency, Pub/Sub, State Store, Secret Store)
- Kustomize (overlays, patches, commonLabels)
- Kubernetes (kubectl, CRDs, namespaces)
- GitHub Actions (CI/CD pipeline)

## Sources Consulted
- Kustomize official documentation (https://kubectl.docs.kubernetes.io/references/kustomize/)
- Dapr Component schema reference (https://docs.dapr.io/operations/components/component-schema/)
- Dapr state store Redis component spec (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr pub/sub Redis component spec (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/)
- Dapr pub/sub Kafka component spec (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/)
- Dapr Resiliency spec (https://docs.dapr.io/operations/resiliency/resiliency-overview/)
- Dapr Azure Cosmos DB state store spec (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/)
- GitHub Actions runner pre-installed software (https://github.com/actions/runner-images)

## Issues Found
1. **CI/CD deploy job missing kustomize installation**: The GitHub Actions `deploy` job used `kustomize build` but did not include a step to install kustomize. Since each job runs on a separate runner, the kustomize binary installed in the `validate` job is not available to the `deploy` job. GitHub-hosted `ubuntu-latest` runners include `kubectl` but not standalone `kustomize`. Added the same kustomize installation step to the deploy job.

## Review Notes
- The Dapr Component `auth` field is correctly placed at the root level (sibling to `spec`), matching the Dapr Component CRD schema.
- Kustomize's default merge behavior for CRD arrays (like Dapr `spec.metadata`) is to replace the entire array rather than merge individual items. This means the development overlay patches effectively replace all metadata entries, not just the ones listed. The patches as written are functional, but readers should be aware that omitted metadata fields from the base will be dropped. For example, the development statestore patch omits `actorStateStore` and `ttlInSeconds` from the base, so those won't be present in the rendered development configuration.
- The `commonLabels` field used in the kustomization files is deprecated in Kustomize 5.x in favor of the `labels` transformer, but it still works and is widely used in tutorials.
- The base `secrets.yaml` content is referenced in the project layout and kustomization.yaml but never shown. The development overlay patches a component named `secretstore` which must be defined in this unseen file. This is a minor completeness gap but not an error.
- All Dapr component types (`state.redis`, `pubsub.redis`, `state.azure.cosmosdb`, `pubsub.kafka`, `secretstores.local.file`) and the `Resiliency` kind are valid and current.
- The `secretKeyRef` syntax for referencing Kubernetes secrets in Dapr component metadata is correct.
- All kubectl and kustomize CLI commands shown are syntactically correct and use valid flags.
