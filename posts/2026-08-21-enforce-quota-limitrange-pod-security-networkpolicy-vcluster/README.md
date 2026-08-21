# How to Enforce Quotas, Pod Security, and NetworkPolicy for vCluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Multi-Tenancy, ResourceQuota, NetworkPolicy

Description: Layer vCluster resource, Pod Security, and network policies with tenant-side controls and host-cluster enforcement for shared-node tenants.

---

A vCluster isolates the Kubernetes API, but shared-node workloads still consume and communicate through the control plane cluster. A reliable tenant baseline therefore needs controls at more than one layer: vCluster must constrain translated Pods, the control plane cluster must enforce resources and network traffic, and tenant namespaces may need their own Kubernetes policies.

This guide targets vCluster **0.36** with a containerized control plane and Shared Nodes. These controls reduce risk for trusted internal tenants; they do not turn shared Linux nodes into a security boundary for untrusted tenants. Use Private Nodes when the workload or trust model requires node, CNI, and CSI isolation.

## Start with an Explicit vCluster Baseline

Create a version-controlled `vcluster.yaml`:

```yaml
policies:
  podSecurityStandard: restricted

  resourceQuota:
    enabled: true
    quota:
      requests.cpu: "4"
      requests.memory: 8Gi
      limits.cpu: "8"
      limits.memory: 16Gi
      requests.storage: 200Gi
      count/pods: 50
      count/persistentvolumeclaims: 20
      services.loadbalancers: 0
      services.nodeports: 0

  limitRange:
    enabled: true
    default:
      cpu: "1"
      memory: 1Gi
      ephemeral-storage: 4Gi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
      ephemeral-storage: 1Gi
    max:
      cpu: "4"
      memory: 8Gi

  networkPolicy:
    enabled: true
    workload:
      publicEgress:
        enabled: false

sync:
  toHost:
    namespaces:
      enabled: false
    networkPolicies:
      enabled: false
```

Apply it through the deployment mechanism that owns the release:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --connect=false \
  --upgrade \
  --values vcluster.yaml
```

Review the numbers against real workload requests and capacity. vCluster's published defaults are examples, not a substitute for sizing. In particular, a CPU or memory quota works predictably only when Pods declare requests and limits; the LimitRange supplies defaults for containers that omit them.

## Know What Each Setting Enforces

`policies.podSecurityStandard: restricted` makes vCluster evaluate Pod specs against the Kubernetes Restricted Pod Security Standard before syncing them. This blocks common privilege paths such as privileged containers and direct `hostPath` volumes. It does not inspect the backend behind a PVC, so keep host PersistentVolume sync disabled unless a separate host admission policy constrains it.

`policies.resourceQuota` and `policies.limitRange` create host-cluster objects in the vCluster release namespace. They govern the translated workload objects that consume resources there. They do not limit every object stored only in the tenant control plane-for example, a tenant can still create large numbers of API-only objects unless you also create a ResourceQuota inside the tenant cluster.

`policies.networkPolicy.enabled` creates platform-managed NetworkPolicies for the vCluster control plane and its translated workloads in the host namespace. The policy is inert unless the control plane cluster's CNI actually enforces Kubernetes NetworkPolicy. Also note the v0.36 default: when this policy is enabled, workload public egress is enabled unless you explicitly set `workload.publicEgress.enabled: false` or configure narrower rules.

The final `sync.toHost.networkPolicies.enabled: false` is intentional. That setting controls whether NetworkPolicy objects authored by the tenant are translated to the host. It is separate from `policies.networkPolicy`. Tenant policies are additive with other Kubernetes NetworkPolicies, so a broad tenant allow rule can widen ordinary default-deny policy. Enable tenant-authored policy sync only behind a higher-precedence boundary such as AdminNetworkPolicy or host admission that constrains dangerous peers and empty peer lists.

## Add Tenant-Internal Quotas and Defaults

Create policies inside each tenant namespace when you also want the tenant API server to reject excess API objects and provide immediate feedback. For example, while connected to the vCluster:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: application-budget
  namespace: apps
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    count/pods: "50"
    count/secrets: "100"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: container-defaults
  namespace: apps
spec:
  limits:
    - type: Container
      default:
        cpu: "1"
        memory: 1Gi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
```

These tenant objects complement the host policies; they do not replace them. A tenant administrator may be allowed to change tenant-side objects, while the platform-owned host policies remain outside that tenant API.

## Do Not Miss Namespace-Sync Coverage

The baseline policy objects are permanently scoped to the vCluster release namespace. If `sync.toHost.namespaces.enabled` is enabled, tenant namespaces map to separate host namespaces. The baseline ResourceQuota, LimitRange, and NetworkPolicy do **not** follow them.

For namespace-sync deployments, have the platform provision equivalent host ResourceQuota, LimitRange, and NetworkPolicy objects in every mapped namespace before workloads arrive. Treat namespace creation and policy creation as one operation. Verify coverage from the host context:

```bash
kubectl --context host get resourcequota,limitrange,networkpolicy \
  --all-namespaces
```

## Test the Effective Boundary

Test behavior rather than only reading rendered configuration:

1. Create a compliant Pod without requests and confirm the translated host Pod receives LimitRange defaults.
2. Exceed CPU, memory, object-count, and storage quota separately and confirm the API rejects each attempt.
3. Submit Pods with `privileged: true`, `hostNetwork: true`, and a direct `hostPath` volume and confirm the configured Restricted policy rejects them.
4. From a tenant Pod, test approved DNS and application traffic, another tenant's Pod or Service, and cloud metadata such as `169.254.169.254`.
5. Inspect the actual host NetworkPolicies and repeat the tests after a CNI upgrade.

Use both negative and positive tests. A policy that blocks DNS, metrics, storage, or an approved dependency is not ready for production, even when its denial tests pass.

## Operational Guardrails

Keep the baseline in a required Platform template or another operator-owned deployment source so tenants cannot loosen `vcluster.yaml`. Add host admission for controls vCluster cannot fully express, including protected tolerations, host namespace mapping, runtime classes, unsafe PersistentVolumes, and ingress hostname ownership.

Monitor quota utilization before hard limits turn a traffic spike into an outage. ResourceQuota limits admission of new or expanded objects; it does not evict existing Pods to make capacity. NetworkPolicy also has no portable deny logging, so use the CNI's flow observability when diagnosing unexpected reachability.

## Official Documentation

- [vCluster: Policies configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies)
- [vCluster: Shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [vCluster: Deploy with isolated workloads](https://www.vcluster.com/docs/vcluster/deploy/worker-nodes/host-nodes/isolated-workloads)
- [Kubernetes: Resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Limit ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes: Network policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

## Conclusion

Enforce the tenant budget and Pod standard through vCluster, enforce translated resource and network behavior in the control plane cluster, and add tenant-side objects for fast namespace-level feedback. Then test the real host-side result. Quota, LimitRange, Pod Security, and NetworkPolicy are complementary layers-not interchangeable checkboxes.
