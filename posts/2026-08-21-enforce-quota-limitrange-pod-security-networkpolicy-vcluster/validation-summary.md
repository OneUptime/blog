# Validation Summary: How to Enforce Quotas, Pod Security, and NetworkPolicy for vCluster

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- vCluster 0.36 with a containerized control plane and Shared Nodes
- Kubernetes ResourceQuota and LimitRange
- Kubernetes Pod Security Standards
- Kubernetes NetworkPolicy
- Kubernetes Network Policy API (`ClusterNetworkPolicy` and `AdminNetworkPolicy`)
- Kubernetes namespace synchronization and multi-tenancy controls
- Helm values merging and the vCluster CLI

## Sources Consulted

- [vCluster 0.36: Policies configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies)
- [vCluster 0.36: Resource quota](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/resource-quota)
- [vCluster 0.36: Limit range](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/limit-range)
- [vCluster 0.36: Network policy](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/network-policy)
- [vCluster 0.36: NetworkPolicy synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/networking/network-policies)
- [vCluster 0.36: Namespace synchronization](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/namespaces)
- [vCluster: Shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [vCluster: Deploy with isolated workloads](https://www.vcluster.com/docs/vcluster/deploy/worker-nodes/host-nodes/isolated-workloads)
- [vCluster: Lifecycle policy and supported versions](https://www.vcluster.com/docs/vcluster/manage/upgrade/supported_versions)
- [vCluster v0.36.0 chart defaults](https://github.com/loft-sh/vcluster/blob/v0.36.0/chart/values.yaml#L1147-L1169)
- [vCluster v0.36.0 ResourceQuota template](https://github.com/loft-sh/vcluster/blob/v0.36.0/chart/templates/resourcequota.yaml)
- [vCluster v0.36.0 LimitRange template](https://github.com/loft-sh/vcluster/blob/v0.36.0/chart/templates/limitrange.yaml)
- [vCluster v0.36.0 NetworkPolicy template](https://github.com/loft-sh/vcluster/blob/v0.36.0/chart/templates/networkpolicy.yaml)
- [vCluster v0.36.0 create-command flags](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/cli/flags/create/create.go)
- [vCluster v0.36.0 Pod Security validation](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/pods/validate_pod_security.go)
- [vCluster v0.36.0 host-object creation and `SyncError` handling](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/patcher/apply.go#L55-L84)
- [vCluster v0.36.0 isolation end-to-end tests](https://github.com/loft-sh/vcluster/blob/v0.36.0/e2e/test_security/isolation/test_isolation.go#L98-L157)
- [Helm: Values files and value precedence](https://helm.sh/docs/chart_template_guide/values_files/)
- [Kubernetes: Resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Limit ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes: Network policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Endpoints API deprecation](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)
- [Kubernetes Network Policy API: v1alpha2 update](https://network-policy-api.sigs.k8s.io/blog/2025/10/09/api-update-for-v1alpha2-clusternetworkpolicy-replaces-adminnetworkpolicy-and-baselineadminnetworkpolicy/)
- [Kubernetes Network Policy API: Implementations](https://network-policy-api.sigs.k8s.io/implementations/)

## Issues Found

- The partial `policies.resourceQuota.quota` map looked exhaustive but Helm deep-merges it with the vCluster chart defaults. Added the six inherited v0.36 defaults for ephemeral storage, Services, Secrets, ConfigMaps, and Endpoints, and explained that unwanted inherited entries must be set to `null`.
- `services.nodeports: 0` can reject the NodePort Service that `vcluster create` exposes by default on a detected local cluster, even with `--connect=false`. Added `--expose-local=false` so the installation command is compatible with its own quota.
- The host ResourceQuota and LimitRange were described as governing translated workloads only. Corrected the explanation to state that they cover all matching objects or containers in the release namespace, including the vCluster control plane, and therefore require platform overhead.
- The public-egress sentence implied arbitrary narrower rules beneath `workload.publicEgress`. Corrected it to name the v0.36 fields actually available there: `cidr` and `except`.
- The higher-precedence network boundary named only `AdminNetworkPolicy`. Updated it for the current Network Policy API: v1alpha2 `ClusterNetworkPolicy` replaces that model for new implementations, while v1alpha1 `AdminNetworkPolicy` remains maintained. The text now also requires confirmation that the host CNI implements the selected API.
- Namespace synchronization was described as mapping every tenant namespace to a separate host namespace. Corrected this to mapped namespaces and documented the vCluster 0.36 limitation that tenant NetworkPolicy synchronization is unsupported when namespace synchronization is enabled.
- The quota test expected every attempt to be rejected synchronously. Corrected it to distinguish tenant-side admission (`403 Forbidden`) from asynchronous host-side denial, which leaves the tenant object unsynced and reports a `Warning`/`SyncError`; also clarified that a Deployment can be admitted before later Pod creation fails.
- The operational guidance assumed every NetworkPolicy-capable CNI exposes flow telemetry. Corrected it to recommend flow observability only when the chosen CNI provides it.

## Review Notes

- vCluster 0.36 is in active support on the validation date, and its documented default tenant Kubernetes version is 1.36. The examples were rendered successfully against the official v0.36 chart templates.
- The command relies on the vCluster CLI's default chart selection. For long-lived reproducibility, run it with a v0.36 CLI or pin the current v0.36 patch using `--chart-version v0.36.1`.
- `count/pods` is the generic object-count quota and can include retained terminal Pods. Operators whose tenants run many Jobs should evaluate whether the specialized `pods` quota better matches the intended budget.
- `count/endpoints` is retained because it is an inherited vCluster 0.36 chart default. The core `Endpoints` API is deprecated in Kubernetes 1.33 and later, so operators should also evaluate an EndpointSlice quota for their host environment.
- `sync.toHost.persistentVolumes.enabled` already defaults to `false` in vCluster 0.36. Setting it explicitly can make the security decision more visible, but it is not required for the shown behavior.
- Network Policy API v1alpha2 and v1alpha1 resources are optional CRDs rather than universally available core Kubernetes APIs. The post correctly requires host-CNI support and does not assume they are portable.
