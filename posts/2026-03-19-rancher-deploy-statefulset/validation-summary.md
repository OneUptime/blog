# Validation Summary: How to Deploy a StatefulSet Workload in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager UI
- Kubernetes StatefulSets
- Kubernetes Services, including headless Services
- Kubernetes StorageClasses, PersistentVolumes, and PersistentVolumeClaims
- PostgreSQL container deployment
- `kubectl`

## Sources Consulted
- Rancher Docs: Dynamically Provisioning New Storage in Rancher — https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/create-kubernetes-persistent-storage/manage-persistent-storage/dynamically-provision-new-storage
- Rancher Docs: Kubernetes Workloads and Pods — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods
- Rancher Docs: Services — https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-resources-setup/create-services
- Kubernetes Docs: StatefulSets — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Docs: `kubectl get` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Docker Official Image: `postgres` — https://hub.docker.com/_/postgres/
- PostgreSQL Documentation: Replication — https://www.postgresql.org/docs/current/runtime-config-replication.html
- Rancher Local Path Provisioner — https://github.com/rancher/local-path-provisioner

## Issues Found

1. **The Rancher navigation wording did not match current Rancher docs.** Updated the UI path from `Workloads > StatefulSets` to the documented flow of `Workload` -> `Create` -> `StatefulSet`, and adjusted the edit step to use the current `Workload` wording.

2. **The post implied Rancher would create the required headless Service for StatefulSet pod identity.** Kubernetes requires a matching headless Service for StatefulSet network identity, while Rancher docs only guarantee automatic workload service creation and service-discovery entries based on configured ports. Updated the wording to remove the unsupported guarantee and point readers to the YAML example that explicitly creates the headless Service.

3. **The PostgreSQL example used `replicas: 3` with the plain `postgres:15` image, which is misleading.** A basic PostgreSQL container does not become a replicated PostgreSQL cluster simply by running multiple StatefulSet replicas; PostgreSQL replication requires separate configuration. Changed the example to a single replica and added a scaling caveat stating that replicas should remain at `1` unless PostgreSQL replication is configured separately.

4. **The PVC verification command depended on labels that were not declared in the example manifest.** Changed `kubectl get pvc -l app=my-postgres -n default` to `kubectl get pvc -n default` so the verification step is unambiguous for the provided example.

5. **The `subPath` wording was too strong.** The post described the `postgres` subdirectory mount as "recommended for PostgreSQL"; updated this to an optional choice so the guidance does not overstate it as a universal requirement.

6. **The PVC deletion statement needed a default-behavior caveat.** Updated the scaling section to say PVCs are not deleted automatically *by default*, which better reflects current Kubernetes behavior.

## Review Notes
- The DNS example assumes the default cluster domain `cluster.local`. That is correct for many clusters, but some environments use a different cluster domain.
- Current Kubernetes docs recommend `ReadWriteOncePod` for production StatefulSet examples where the cluster supports it. The post keeps `ReadWriteOnce`, which remains valid and is broadly compatible.
- PostgreSQL `15` is still a supported release as of 2026-05-07, so the version choice is not outdated.
