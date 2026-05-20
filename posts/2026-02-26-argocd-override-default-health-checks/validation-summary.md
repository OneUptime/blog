# Validation Summary: How to Override Default Health Checks in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource health checks
- Argo CD `argocd-cm` resource customizations
- Lua health check scripts
- Kubernetes workloads, Services, Ingresses, Jobs, and PersistentVolumeClaims
- Kubernetes `kubectl patch`
- Argo CD community Helm chart values

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD GitOps Engine Service health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_service.go
- Argo CD GitOps Engine Deployment health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_deployment.go
- Argo CD GitOps Engine Job health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_job.go
- Argo CD Helm chart README and values reference: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Argo CD Helm chart values.yaml: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said the built-in Service health check considers all Services healthy. Argo CD's built-in check reports non-LoadBalancer Services as healthy, but LoadBalancer Services remain Progressing until `status.loadBalancer.ingress` has an entry. Updated the default health check summary and the Service override introduction.
- The Service override section said it could flag Services with no endpoints, but a Service health check only receives the Service object and the example did not inspect Endpoints or EndpointSlices. Updated the text to describe the actual behavior: more detailed reporting for LoadBalancer provisioning.
- The Helm values example used `server.config`, which has been replaced by `configs.cm` in the current Argo CD community Helm chart. Updated the snippet to use `configs.cm`.
- The Service override message referred only to a LoadBalancer IP even though Kubernetes LoadBalancer ingress entries may contain either an IP or hostname. Updated the comment and message to say address.

## Review Notes
The Lua snippets follow Argo CD's documented custom health check shape: use the global `obj`, return a table containing `status` and optional `message`, and configure keys as `resource.customizations.health.<group>_<kind>`. The `kubectl patch` syntax and JSON patch type match the Kubernetes CLI reference. `kubectl` was not installed in the local environment, so the command was verified against Kubernetes documentation rather than local `--help` output.
