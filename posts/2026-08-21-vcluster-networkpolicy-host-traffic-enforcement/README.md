# Why vCluster NetworkPolicy May Not Isolate Host Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, NetworkPolicy, CNI, Multi-Tenancy

Description: Trace a vCluster NetworkPolicy from the tenant API to the host CNI and place isolation controls at the layer that can actually enforce them.

---

A NetworkPolicy can exist and look correct inside a vCluster while host traffic remains reachable. On Shared Nodes, the workload Pod that sends packets is a translated Pod in the control plane cluster. The control plane cluster's CNI-not the tenant API server-ultimately decides whether those packets pass.

This guide targets vCluster **0.36** with a containerized control plane and Shared Nodes. Private Nodes have their own workers and CNI, so their enforcement path is different.

## Follow the Policy to the Data Plane

The path is:

```text
tenant NetworkPolicy
        |
        | sync.toHost.networkPolicies
        v
translated host NetworkPolicy
        |
        | control plane cluster CNI
        v
packet allowed or denied
```

By default, `sync.toHost.networkPolicies` is disabled. In that state, a tenant NetworkPolicy remains an API object inside the vCluster and has no effect on traffic from translated Pods. Enable synchronization only after designing the host-side tenant boundary:

```yaml
sync:
  toHost:
    networkPolicies:
      enabled: true
```

Apply the configuration with the deployment source that owns the release, then create a simple tenant policy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Check both views. The translated object's name and namespace may differ, so do not assume the tenant identity is its host identity:

```bash
kubectl --context tenant -n apps get networkpolicy default-deny -o yaml
kubectl --context host get networkpolicy --all-namespaces
kubectl --context host get pods --all-namespaces -o wide
```

If no host policy appears, check that synchronization is enabled, the vCluster control-plane identity has the generated RBAC for NetworkPolicies, and syncer logs do not show an admission denial. If the host policy exists but traffic still passes, test whether the installed CNI actually enforces NetworkPolicy; accepting the API object is not proof of enforcement.

## Separate Tenant Policies from Platform Policies

Two similar settings serve different owners:

- `sync.toHost.networkPolicies.enabled` translates NetworkPolicies authored inside the tenant cluster.
- `policies.networkPolicy.enabled` makes vCluster create platform-managed NetworkPolicies in the host release namespace for the control plane and workload traffic.

A strong baseline starts with a platform-owned host policy:

```yaml
policies:
  networkPolicy:
    enabled: true
    workload:
      publicEgress:
        enabled: false
```

This setting still needs an enforcing host CNI. It also covers only the vCluster release namespace. In vCluster 0.36, `sync.toHost.networkPolicies` is not supported with `sync.toHost.namespaces`; tenant NetworkPolicy objects do not sync in namespace-sync mode. If namespace synchronization maps tenant namespaces into additional host namespaces, provision equivalent platform-owned host policies in each mapped namespace.

## Understand the Additive-Policy Trap

Ordinary Kubernetes NetworkPolicies are additive: for a selected Pod, the allowed connections are the union of all applicable policies. A platform default-deny does not override a tenant allow-all policy. For example, this tenant egress rule can reopen every destination:

```yaml
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - {}
```

vCluster scopes label-based Pod peers with tenant markers during translation, which helps prevent a tenant selector from matching another tenant's translated Pods. It cannot add tenant identity to an `ipBlock`, and a rule with no `to` or `from` peers matches all destinations or sources under Kubernetes semantics.

If tenant-authored policies are synchronized, place the non-overridable platform boundary at a higher-priority layer, such as a Network Policy API `ClusterNetworkPolicy` with `spec.tier: Admin` and `Deny` actions when that API is installed and supported by the host network-policy implementation, or a CNI-specific tier that precedes ordinary NetworkPolicy. Another option is host admission that rejects translated policies containing an `ipBlock` peer outside an explicit allowlist or ingress/egress rules with no peer list. The Network Policy API `Baseline` tier is intentionally overridable and is not a substitute for a mandatory deny boundary.

## Test the Interfaces that Matter

Use a matrix rather than one `curl` command:

| Source | Destination | Expected result |
| --- | --- | --- |
| Tenant app Pod | Approved same-tenant Service | Allowed |
| Tenant app Pod | DNS | Allowed |
| Tenant A Pod | Tenant B Pod IP and Service | Denied |
| Tenant Pod | Host management Service | Denied; resident-node paths need a separate host control |
| Tenant Pod | `169.254.169.254` cloud metadata | Denied |
| Approved ingress path | Tenant Service | Allowed |

Run the client in the tenant, but observe the translated source Pod and host-side policies from a host context. Use the CNI's flow logs or policy tracing to determine which rule allowed a packet.

Be explicit about networking outside the portable NetworkPolicy model:

- Standard NetworkPolicy always allows traffic to and from a Pod's resident node. Behavior involving `hostNetwork: true` Pods is otherwise undefined and varies by network plugin. Deny host networking through Pod Security Admission, and use an appropriate host or network-plugin control when resident-node traffic must be blocked.
- Do not assume standard NetworkPolicy covers Multus or direct underlay secondary interfaces; enforce and test those interfaces separately.
- Service, ingress, load balancer, and Gateway behavior can involve node-local, proxy, or controller traffic; test the exact path your CNI and controller implement.
- Policies select Pods by labels. Verify the translated Pod has the labels the translated policy expects.

## A Safe Rollout Order

First confirm that the host CNI enforces policy in a disposable namespace. Next establish platform-owned default-deny controls and explicit DNS, control-plane, metrics, storage, and ingress allowances. Test them with tenant policy sync still disabled. Only then decide whether tenants need to author their own host-effective policies.

If they do and namespace synchronization is disabled, enable sync for a canary tenant, enforce policy-shape admission, and rerun cross-tenant and metadata tests. Keep the vCluster configuration in an operator-controlled template so the synchronization and platform policy settings cannot drift independently.

## Official Documentation

- [vCluster: Sync NetworkPolicies to the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/networking/network-policies)
- [vCluster: Managed network policy configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/network-policy)
- [vCluster: Namespace synchronization limitations](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/advanced/namespaces#networkpolicy-syncing-is-disabled)
- [vCluster: Shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [vCluster: Shared Nodes quick start](https://www.vcluster.com/docs/vcluster/quick-start/shared-nodes)
- [Kubernetes: Network policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes SIG Network Policy API: ClusterNetworkPolicy](https://network-policy-api.sigs.k8s.io/reference/spec/)

## Conclusion

A tenant NetworkPolicy affects Shared Nodes only after vCluster translates it and the control plane cluster's CNI enforces it. Build the mandatory boundary as a platform-owned host control, treat tenant-authored policies as an optional additive layer, and test every real packet path-including DNS, metadata, host services, and cross-tenant traffic.
