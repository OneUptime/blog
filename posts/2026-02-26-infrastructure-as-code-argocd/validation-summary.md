# Validation Summary: How to Implement Infrastructure as Code with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet resources
- GitOps
- Kubernetes
- Crossplane
- Crossplane CompositeResourceDefinitions and claims
- tf-controller / Tofu Controller
- Flux GitRepository sources
- Google Config Connector
- Google Cloud SQL

## Sources Consulted
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD ApplicationSet documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/
- Crossplane Helm chart repository index: https://charts.crossplane.io/stable/index.yaml
- Crossplane claims documentation: https://docs.crossplane.io/v1.19/concepts/claims/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Tofu Controller / tf-controller getting started documentation: https://flux-iac.github.io/tofu-controller/getting_started/
- Tofu Controller Terraform output documentation: https://flux-iac.github.io/tofu-controller/use-tf-controller/provision-resources-obtain-outputs/
- Google Config Connector SQLInstance reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/sql/sqlinstance

## Issues Found
- The Crossplane provider and infrastructure `Application` examples used `argocd.argoproj.io/sync-wave` annotations without stating that sync waves only order resources within a sync operation. I clarified that these Application manifests need to be synced by a parent application for the wave ordering to apply.
- The tf-controller Helm repository URL in the Argo CD Application snippet pointed to `https://weaveworks.github.io/tf-controller`, which no longer exposes a valid Helm index. I changed it to the current `https://flux-iac.github.io/tofu-controller` chart repository and pinned the example to chart version `0.15.1`, which exists in that repository index.
- The tf-controller section omitted the Flux source-controller prerequisite even though the Terraform resource references a Flux `GitRepository`. I added a short prerequisite note and clarified that the example assumes a matching `GitRepository` exists.
- The ApplicationSet example used `destination.server: "{{cluster}}"` while the list values were cluster names, not Kubernetes API server URLs. I changed this to `destination.name: "{{cluster}}"`, which matches Argo CD's documented destination fields.
- The drift detection paragraph described the default interval as exactly 3 minutes. I corrected it to Argo CD's documented default reconciliation setting: 120 seconds plus up to 60 seconds of jitter, for a maximum of 3 minutes.

## Review Notes
- The Crossplane examples are valid for the pinned Crossplane 1.14.5 chart, and that chart version exists in the official Crossplane Helm repository. Crossplane 2.x is current as of this review and uses newer XRD patterns, so this section may deserve a future version refresh if the post is updated beyond the pinned 1.x example.
- The Config Connector `SQLInstance` fields shown, including `databaseVersion`, `settings.availabilityType`, and `settings.backupConfiguration.startTime`, match the official Config Connector reference.
- The Argo CD CLI commands shown use valid `argocd app` subcommands.
