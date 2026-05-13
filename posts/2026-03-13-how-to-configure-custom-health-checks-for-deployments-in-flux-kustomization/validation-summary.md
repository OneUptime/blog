# Validation Summary: How to Configure Custom Health Checks for Deployments in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux CLI
- Kubernetes Deployments
- Kubernetes kubectl
- GitOps

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API v1 reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl rollout status` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The post described `spec.healthChecks` as "custom health checks" that define exact Deployment conditions. Flux documentation defines `healthChecks` as resource references for built-in health assessment, while custom logic is handled separately through health check expressions for supported custom resources. I updated the title, description, introduction, section heading, and related wording to describe explicit Deployment health checks rather than custom Deployment condition logic.
- The post stated that combining `wait: true` and `healthChecks` makes Flux check all resources and additionally check listed resources. Flux documentation states that when `wait: true` is set, `healthChecks` is ignored. I rewrote that section to explain choosing between `wait` and `healthChecks`, and adjusted the examples accordingly.
- The description claimed health checks provide automated rollback. Flux Kustomization health check failures mark reconciliation as not ready and report the failure; they do not provide automatic rollback by themselves. I removed the rollback claim.
- The monitoring examples used `flux get kustomization`. Official Flux CLI documentation lists the get subcommand as `flux get kustomizations`, so I updated those commands.
- The status explanation implied that `.status.conditions` shows health for each checked resource. Flux reports Kustomization conditions and failure messages there, so I updated the wording and used `kubectl get ... -o json` for the JSON condition example.
- The dependency example implied the database itself was guaranteed available. I narrowed the wording to say the database Deployment has rolled out, which matches what the Deployment health check can verify.

## Review Notes
The remaining examples use the current `kustomize.toolkit.fluxcd.io/v1` API shape and valid Kubernetes YAML. The prerequisite versions are conservative; Flux health checks existed before Flux v2.3, but the stated requirement is not technically harmful.
