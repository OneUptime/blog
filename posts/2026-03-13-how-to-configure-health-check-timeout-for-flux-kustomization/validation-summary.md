# Validation Summary: How to Configure Health Check Timeout for Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization API
- Flux CLI
- Kubernetes Deployments
- Kubernetes StatefulSets
- Kubernetes readiness probes
- kubectl
- jq

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux v2.3 release announcement and supported Kubernetes versions: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Flux release support policy: https://fluxcd.io/flux/releases/
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The prerequisites said Flux v2.3 or later could be used with Kubernetes 1.25 or later. Upstream Flux v2.3 documents support for Kubernetes 1.28, 1.29, and 1.30, and current Flux support follows upstream-supported Kubernetes versions. Updated the prerequisite to require a Kubernetes version supported by the Flux release, with the Flux v2.3 range called out explicitly.
- The mixed health-check example referenced an `Ingress` in `spec.healthChecks`. Flux documents built-in health-check support for kinds such as Deployment, StatefulSet, PersistentVolumeClaim, Pod, Job, Service, Secret, ConfigMap, and CustomResourceDefinition, but not Ingress. Replaced the example `Ingress` health check with a `Service`.
- The monitoring example used `flux get kustomization my-app -o json`. The official Flux CLI documents `flux get kustomizations` and its watch flag, but not a singular `flux get kustomization` command or `-o json` for that subcommand. Updated the condition-inspection command to use `kubectl get kustomization ... -o json`, and updated the watch command to `flux get kustomizations --watch`.

## Review Notes
The timeout values and rollout calculations are reasonable examples, but actual rollout duration depends on cluster scheduling capacity, image cache state, `maxSurge`, `maxUnavailable`, readiness/startup probes, and workload-specific controllers. Flux also applies `spec.timeout` to validation, apply, and health-check operations during reconciliation, not only to health checks.
