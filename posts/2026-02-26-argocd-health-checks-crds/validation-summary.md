# Validation Summary: How to Configure Custom Health Checks for CRDs in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD custom resource health checks
- Kubernetes Custom Resource Definitions
- Lua health check scripts
- kubectl and jq
- Zalando Postgres Operator
- Strimzi Kafka Operator
- Crossplane managed resources
- KEDA ScaledObject
- Flux Kustomization

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- KEDA ScaledObject pause/autoscaling documentation: https://keda.sh/docs/2.19/concepts/scaling-deployments/
- Strimzi Operator documentation for Kafka custom resource status and Ready condition: https://strimzi.io/docs/operators/latest/deploying
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane with Argo CD guide: https://docs.crossplane.io/v1.19/guides/crossplane-with-argo-cd/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Zalando Postgres Operator cluster manifest documentation: https://opensource.zalando.com/postgres-operator/docs/reference/cluster_manifest.html

## Issues Found
- The KEDA ScaledObject health check checked the `Ready` condition before checking pause annotations. A paused ScaledObject that still had `Ready=True` could be reported as `Healthy`. Moved the pause check before condition processing and included `autoscaling.keda.sh/paused-replicas`, which KEDA documents as another pause annotation.
- The Lua log inspection command targeted `deployment/argocd-application-controller`. Standard Argo CD installs run the application controller as a StatefulSet, so the command was changed to `statefulset/argocd-application-controller`.

## Review Notes
The core Argo CD health customization key format, Lua return object shape, allowed custom health statuses, wildcard caveat, and ability to override Go-based health checks match the current Argo CD documentation. The example CRD condition patterns are generally accurate, but production health checks should still be verified against the exact operator version and CRD schema deployed in the target cluster.
