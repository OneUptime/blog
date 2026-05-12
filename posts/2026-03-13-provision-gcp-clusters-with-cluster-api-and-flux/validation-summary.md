# Validation Summary: How to Provision GCP Clusters with Cluster API and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cluster API (CAPI)
- Cluster API Provider GCP (CAPG)
- Google Kubernetes Engine (GKE)
- Flux CD (Kustomize controller)
- `clusterctl` CLI
- `gcloud` CLI
- Kubernetes (`MachinePool`, taints, labels, OAuth scopes)

## Sources Consulted
- CAPG v1.7.0 `GCPManagedControlPlane` types: https://github.com/kubernetes-sigs/cluster-api-provider-gcp/blob/v1.7.0/exp/api/v1beta1/gcpmanagedcontrolplane_types.go
- CAPG v1.7.0 `GCPManagedMachinePool` types: https://github.com/kubernetes-sigs/cluster-api-provider-gcp/blob/v1.7.0/exp/api/v1beta1/gcpmanagedmachinepool_types.go
- CAPG v1.11.0 `GCPManagedControlPlaneClassSpec` and `GCPManagedMachinePoolClassSpec`: https://github.com/kubernetes-sigs/cluster-api-provider-gcp/blob/v1.11.0/exp/api/v1beta1/types_class.go
- CAPG v1.11.0 `Taint` / `TaintEffect` definitions: https://github.com/kubernetes-sigs/cluster-api-provider-gcp/blob/v1.11.0/exp/api/v1beta1/types.go
- CAPG release list: https://github.com/kubernetes-sigs/cluster-api-provider-gcp/releases
- DeepWiki GKE Resources reference: https://deepwiki.com/kubernetes-sigs/cluster-api-provider-gcp/3.3-gke-resources
- Flux Kustomization API (`kustomize.toolkit.fluxcd.io/v1`)

## Issues Found
Multiple resource specs referenced fields that do not exist on the CAPG `GCPManagedControlPlane` or `GCPManagedMachinePool` resources. All fixes were verified against the CAPG `v1beta1` Go types and JSON tags.

1. **CAPG version bumped from `v1.7.0` to `v1.11.1`.** The v1.7.0 release is from June 2024 — the blog is dated March 2026, and v1.11.1 (March 10, 2026) is the most recent release at the time of writing.

2. **`GCPManagedControlPlane` field corrections (Step 3):**
   - `kubernetesVersion` → `controlPlaneVersion` (the field name in the CAPG API).
   - `releaseChannel: REGULAR` → `releaseChannel: regular`. The CAPG `ReleaseChannel` enum is `rapid|regular|stable` (lowercase), not the GCP API's uppercase form.
   - Removed `enablePrivateNodes`, `masterIpv4CidrBlock`, `workloadIdentityConfig`, `loggingConfig`, `monitoringConfig`. None of these fields exist on `GCPManagedControlPlaneSpec` / `GCPManagedControlPlaneClassSpec` in v1.7.0 or v1.11.x. The spec only exposes `clusterName`, `project`, `location`, `enableAutopilot`, `releaseChannel`, `controlPlaneVersion`/`version`, `endpoint`, `master_authorized_networks_config`, `clusterNetwork`, `clusterSecurity`, `binaryAuthorization`, `loggingService`, `monitoringService`, etc.
   - `masterAuthorizedNetworksConfig` / `cidrBlocks` / `cidrBlock` / `displayName` → `master_authorized_networks_config` / `cidr_blocks` / `cidr_block` / `display_name`. The CAPG type uses snake_case JSON tags for this struct.

3. **`GCPManagedMachinePool` field corrections (Steps 4 & 5):**
   - Removed the `nodeConfig` wrapper — the spec is flat; there is no `nodeConfig` field.
   - Removed `workloadMetadataConfig.mode: GKE_METADATA` — this field does not exist on `GCPManagedMachinePool`. Workload Identity is configured at the cluster level (and is the default for modern GKE clusters).
   - `oauthScopes` → `nodeSecurity.serviceAccount.scopes`, matching `NodeSecurityConfig`/`ServiceAccountConfig`.
   - `labels` (under nodeConfig) → top-level `kubernetesLabels`.
   - `taints` (under nodeConfig) → top-level `kubernetesTaints`.
   - Removed `spot: true` from the spot pool — there is no `spot` field on `GCPManagedMachinePool` in v1.7.0 or v1.11.x. CAPG exposes Spot provisioning on `GCPMachineTemplate` (self-managed) via `provisioningModel: Spot`, but not on `GCPManagedMachinePool`.
   - Taint `effect: NO_SCHEDULE` → `effect: NoSchedule`. The CAPG `TaintEffect` enum is `NoSchedule|NoExecute|PreferNoSchedule` (CamelCase, same as core Kubernetes).

4. **Best Practices** updated to remove references to non-existent fields (`workloadMetadataConfig.mode`, `enablePrivateNodes`) and to clarify that CAPG v1.11 does not yet expose Spot mode on `GCPManagedMachinePool` — Spot pools must be configured via `gcloud` or the GKE console.

5. **Conclusion** updated to match the corrected manifests (Workload Identity is enabled by default; the secondary pool is described as a tainted pool for batch workloads rather than a Spot pool).

## Review Notes
- The `region` field on `GCPManagedCluster.spec` is correct (verified in `gcpmanagedcluster_types.go`).
- The CAPI API versions (`cluster.x-k8s.io/v1beta1`, `infrastructure.cluster.x-k8s.io/v1beta1`, `controlplane.cluster.x-k8s.io/v1beta1`) are valid for CAPG v1.7.x and v1.11.x. v1.11 also introduced support for `v1beta2`, but `v1beta1` remains supported.
- The Flux `Kustomization` (`kustomize.toolkit.fluxcd.io/v1`) example is syntactically valid and uses correct field names (`interval`, `path`, `prune`, `sourceRef`, `dependsOn`, `healthChecks`, `timeout`).
- `clusterctl generate provider --infrastructure gcp:vX.Y.Z` is a valid `clusterctl` invocation.
- Future caveat: CAPG is actively evolving (Spot support, additional GKE-managed fields, ClusterClass) — readers using CAPG releases after v1.11.x should re-verify against the current CRDs, especially around `nodeSecurity`, `clusterNetwork`, and any added top-level fields.
- The `cloud.google.com/gke-spot` taint key is the auto-applied taint key on GKE-managed Spot VMs. In this post the taint is applied manually to a non-Spot pool, which still works but does not by itself make the nodes Spot — that is the caveat now called out in Best Practices.
