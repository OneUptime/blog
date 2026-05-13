# Validation Summary: How to Deploy Argo Events with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- Kustomize
- HelmRelease and HelmRepository resources
- Argo Events
- Argo Workflows
- NATS JetStream EventBus
- Prometheus metrics

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Argo Events installation documentation: https://argoproj.github.io/argo-events/installation/
- Argo Events JetStream EventBus documentation: https://argoproj.github.io/argo-events/eventbus/jetstream/
- Argo Events EventSource service documentation: https://argoproj.github.io/argo-events/eventsources/services/
- Argo Events webhook authentication documentation: https://argoproj.github.io/argo-events/eventsources/webhook-authentication/
- Argo Events service account documentation: https://argoproj.github.io/argo-events/service-accounts/
- Argo Events Prometheus metrics documentation: https://argoproj.github.io/argo-events/metrics/
- Argo Helm chart source and values: https://github.com/argoproj/argo-helm/tree/main/charts/argo-events

## Issues Found
- The Helm values comment said Prometheus metrics were enabled, but the chart value only configured JetStream versions. Added `controller.metrics.enabled: true` and clarified the JetStream comment.
- The JetStream examples used `latest`. Argo Events documentation warns against using `latest` for real deployments, so the post now uses the supported `2.10.10` version consistently.
- The Flux health check referenced a Deployment named `controller-manager`, but the Helm chart renders the controller Deployment as `argo-events-controller-manager` for this release name. Changed the health check to target the `HelmRelease`, matching Flux guidance for Helm-managed workloads.
- The pipeline manifests were placed in `clusters/my-cluster/argo-events-pipelines` but no Flux Kustomization reconciled that path. Added the missing Kustomize and Flux Kustomization manifests with `dependsOn`.
- The Sensor used a Kubernetes object trigger to create Argo Workflows without assigning a Sensor service account or RBAC. Added a ServiceAccount, Role, RoleBinding, and `spec.template.serviceAccountName`.
- The verification command tried to read a LoadBalancer IP from the generated EventSource service, but Argo Events documents the generated `spec.service` service as ClusterIP for testing. Updated verification to use `kubectl port-forward`.
- The native NATS EventBus best-practice wording called native NATS inherently ephemeral, but Argo Events supports persistence on native NATS Streaming. Reworded it to recommend JetStream while noting native NATS requires explicit persistence.
- The best practice for generic webhook auth referenced `spec.webhook.*.secret`, which is not the documented field for webhook EventSources. Changed it to `spec.webhook.*.authSecret`.
- The `dependsOn` best-practice wording implied it could order resources inside one Flux Kustomization. Clarified that `dependsOn` applies between Flux Kustomizations and that stricter EventBus-to-Sensor ordering requires splitting those manifests.
- The post referred to an Argo Events UI for monitoring. Replaced that with Kubernetes events, pod logs, and Prometheus metrics, which are documented monitoring/debugging paths.

## Review Notes
The sample Workflow still assumes an `argo-workflow-sa` service account exists in the `argo-workflows` namespace and that Argo Workflows is installed there. That is acceptable for the post's stated optional prerequisite, but a production guide should define the workflow execution service account and its RBAC explicitly.
