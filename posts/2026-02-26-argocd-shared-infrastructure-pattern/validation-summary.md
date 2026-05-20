# Validation Summary: How to Implement the Shared Infrastructure Pattern

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications, AppProjects, ApplicationSets, sync waves, sync windows, and custom health checks
- Kubernetes StatefulSets, Services, Namespaces, and NetworkPolicies
- Redis
- cert-manager Helm chart deployment
- GitOps repository organization

## Sources Consulted
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/applicationset/Generators-Cluster/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD resource health customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- cert-manager installation and Helm documentation: https://cert-manager.io/docs/installation/ and https://cert-manager.io/docs/installation/helm/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The repository structure referenced `helmrelease.yaml`, and the version-pinning example used a Flux `HelmRelease` with the incorrect API group for a HelmRelease. Replaced the example with an Argo CD `Application` that pins the cert-manager Helm chart via `targetRevision`.
- The cert-manager Helm value used the older `installCRDs` style while current cert-manager documentation uses `crds.enabled=true` for recent chart versions. Updated the example to use `crds.enabled: true` with the current pinned chart version `v1.20.2`.
- The Redis example described a "Redis cluster" but used three independent Redis pods behind one Service, which would not create a real Redis Cluster and could route clients to divergent data stores. Changed the example to a single shared Redis instance.
- The Redis StatefulSet did not include the headless Service required for StatefulSet network identity. Added a headless Service and pointed `serviceName` at it.
- The NetworkPolicy allowed the monitoring namespace without a port restriction. Added explicit TCP port 6379 restrictions to both ingress rules.

## Review Notes
The Argo CD sync wave, AppProject, ApplicationSet cluster selector, sync window, and custom health check examples are consistent with the official documentation. The Redis example remains a simple shared instance; production high availability should normally use a Redis operator or a correctly configured Redis Cluster/Sentinel deployment.
