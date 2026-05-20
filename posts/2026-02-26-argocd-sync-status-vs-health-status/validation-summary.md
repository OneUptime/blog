# Validation Summary: How to Understand Sync Status vs Health Status in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Argo CD CLI
- Argo CD Application configuration
- Lua custom health checks

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD getting started application status example: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD GitOps Engine health implementation for Deployment, Pod, Service, Ingress, StatefulSet, and Job resources: https://github.com/argoproj/gitops-engine/tree/master/pkg/health

## Issues Found
- The post said Services have endpoints as part of Healthy status. Argo CD does not check Service endpoints; non-LoadBalancer Services are considered Healthy once created, and LoadBalancer Services wait for `status.loadBalancer.ingress`.
- The post described Ingress health as requiring an active backend. Argo CD checks `status.loadBalancer.ingress` for an IP address or hostname, so the Ingress health text was corrected.
- The Deployment health explanation was too broad around ready replicas. It was updated to reflect Argo CD's rollout checks: observed generation, updated replicas, old replicas pending termination, updated replicas availability, and progress deadline failures.
- The Pod health summary was simplified incorrectly. It was updated to reflect Argo CD's handling of pod phase, readiness for `restartPolicy: Always`, waiting reasons ending in error/backoff, failed pods, and recent terminated containers.
- The StatefulSet section implied a Degraded built-in state for replicas not becoming ready. Argo CD's built-in StatefulSet check reports these rollout and readiness cases as Progressing, so that line was removed.
- The Lua custom health check could return an object without `status` when `obj.status` was missing. The snippet now initializes `hs.status` and `hs.message` before inspecting the resource status.

## Review Notes
The CLI commands and `ignoreDifferences` example match official Argo CD documentation. The post intentionally remains version-neutral; health behavior can vary for custom resources and for resources with overridden custom health checks.
