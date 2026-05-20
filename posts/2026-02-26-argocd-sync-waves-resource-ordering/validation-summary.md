# Validation Summary: How to Order Resource Deployment with Sync Waves in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync waves and sync hooks
- Argo CD CLI
- Kubernetes Deployments, StatefulSets, Services, Jobs, ConfigMaps, Secrets, Pods, PVCs, and CRDs
- cert-manager Certificate custom resources

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/health/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_manifests/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The introduction said ArgoCD applies all Sync phase resources together by default. Updated it to say resources without explicit waves default to wave 0, matching Argo CD's documented phase, wave, kind, and name ordering.
- The basic PostgreSQL example referenced `postgres.my-app.svc` but did not define a Service. Added a PostgreSQL Service in wave 1.
- The PostgreSQL `postgres:15` container lacked required authentication configuration and would not start with the stock image. Added a minimal `POSTGRES_PASSWORD` environment variable.
- The wave-processing section said same-wave resources are applied in parallel with no guaranteed ordering. Updated it to reflect Argo CD's documented kind and name ordering while preserving the guidance to use separate waves for application dependencies.
- The microservices example had a frontend using `http://api:8080` without an API Service. Added an API Service in wave 2.
- The health-check descriptions overstated Deployment and StatefulSet health as all Pods running and ready, and understated LoadBalancer Service health. Updated the wording to match Argo CD's documented built-in health checks.
- The debugging commands used invalid or unsupported CLI flags: `argocd app resources my-app -o wide` and `argocd app sync my-app --watch`. Replaced them with documented commands: `argocd app manifests my-app`, `argocd app sync my-app`, and `argocd app get my-app --show-operation`.
- The custom-resource health troubleshooting note said missing health checks cause indefinite waiting. Updated it to the more precise behavior that resources can remain stuck as `Progressing`.

## Review Notes
Local validation was limited because `argocd`, `kubectl`, `kubeconform`, `kubeval`, Ruby, and Node YAML packages were not installed in the environment. The YAML snippets were reviewed manually against Kubernetes and Argo CD documentation.
