# Why cloud-controller-manager Sets the Wrong `InternalIP` or `ExternalIP` on a Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Node IP, InternalIP, ExternalIP, Troubleshooting

Description: Trace incorrect Node addresses to instance matching, provider network selection, stale identity, multihoming, and competing writers without patching status by hand.

---

An external cloud-controller-manager (CCM) obtains provider-known Node addresses and writes them to `.status.addresses`. If it selects the wrong interface, matches the wrong instance, or uses a stale identity, Kubernetes can advertise an unreachable `InternalIP` or an unintended public `ExternalIP`.

Do not confuse a Node's `ExternalIP` with the external address of a `LoadBalancer` Service. Node addresses describe a machine. Service load-balancer addresses live in the Service's `.status.loadBalancer` and follow a different reconciliation path.

## Capture the Evidence

Inspect all address types and identity fields before restarting anything:

```bash
NODE=worker-1

kubectl get node "$NODE" -o json --show-managed-fields | jq '{
  name: .metadata.name,
  providerID: .spec.providerID,
  addresses: .status.addresses,
  region: .metadata.labels["topology.kubernetes.io/region"],
  zone: .metadata.labels["topology.kubernetes.io/zone"],
  taints: .spec.taints,
  managedFields: [.metadata.managedFields[]? | {manager, subresource, time}]
}'

kubectl describe node "$NODE"
```

Then record the machine's real interfaces and routes from the node or an approved debug session:

```bash
ip -brief address
ip route
hostname -f
```

Compare the observed address to the provider console or official CLI. Determine whether the incorrect value is a private address from the wrong NIC, a public/NAT address, an obsolete address from a replaced instance, or the address of an entirely different instance.

## Know Which Component Wrote the Address

With an external provider, the CCM node controller normally retrieves hostnames and network addresses from the cloud API. Kubelet also reports Node status, and providers differ in how controller and kubelet updates are coordinated. Inspect managed fields, CCM logs, kubelet logs, and audit records rather than assuming the last visible value has one universal writer. Use the provider's leader-election Lease to identify the active replica, and set `CCM_LEADER_POD` to that Pod's name before running the log command:

```bash
kubectl get leases -A | grep -i cloud
kubectl logs -n kube-system "$CCM_LEADER_POD" --since=30m | grep -F "$NODE"
journalctl -u kubelet --since '30 minutes ago'
```

If the address repeatedly flips, look for competing writers: on pre-v1.31 clusters, a legacy in-tree integration unintentionally left active during migration; two external CCM installations that use different leader-election locks or have leader election disabled; automation patching Node status; or inconsistent controller flags across control-plane replicas.

## 1. Validate the ProviderID First

The ProviderID is the join key between a Node and its backing instance for many integrations:

```bash
kubectl get node "$NODE" -o jsonpath='{.spec.providerID}{"\n"}'
```

If the provider is expected to set it and it is empty, or if it is duplicated or points to a terminated/replaced instance, address correction is not the first problem. Repair Node-to-instance matching. A controller querying the wrong server can return internally consistent but completely wrong addresses, topology, and lifecycle state. A non-empty `.spec.providerID` is immutable; if it is wrong, correct its provisioning or provider source and recreate the Node through the supported lifecycle procedure rather than trying to edit the field in place.

Common identity causes include reused Node names, unexpected hostname overrides, wrong project/account/region scope, and stale Node objects that survived instance replacement. Compare a healthy Node from the same pool and the provider's canonical instance identifier.

## 2. Inspect Multihomed Network Selection

Cloud instances can have several interfaces and addresses:

- a management interface and a workload interface;
- primary and secondary private addresses;
- IPv4 and IPv6 addresses;
- a provider-level public or elastic address;
- overlay, VPN, or service-mesh interfaces visible only inside the guest; and
- NAT where the public address is not configured on the guest interface.

The provider implementation decides which are valid `NodeAddress` values. Kubernetes does not impose one cross-provider “first private NIC” rule. Read the provider CCM's versioned flags and cloud-config fields for network, subnet, address-family, hostname, or interface selection. A configuration option copied from another provider has no portable meaning.

Verify the selected `InternalIP` is reachable from every component that needs it, including the control plane and other Nodes. A private address is not automatically correct if control-plane routing reaches only a management network.

## 3. Check kubelet Node-IP Configuration

The kubelet can be configured with `--node-ip` or the equivalent tool-specific setting. This affects the address the kubelet selects locally, but it does not override every provider's cloud-derived reconciliation in the same way. Inspect the effective process:

```bash
systemctl cat kubelet
ps -ef | grep '[k]ubelet'
```

A hostname resolving to the wrong interface, an address unavailable at process start, or a dual-stack value in the wrong order can produce unexpected kubelet status. Make a change only through the provisioning system and confirm it matches the provider CCM's documented behavior.

## 4. Check Cloud Scope and Permissions

A narrowly scoped credential can sometimes read the instance but not its attached network objects, or it may query a default region different from the Node's. Inspect CCM logs and cloud audit events for network-interface lookup failures, authorization denial, pagination or throttling errors, and endpoint/region mismatches.

Also check provider-side tags or configuration filters. If the controller chooses a network by tag, name, or subnet ID, duplicated or missing metadata can make selection nondeterministic.

## 5. Check Stale Caches and Replacement Order

If a machine was replaced while retaining the Kubernetes Node name, an old Node object may retain the former ProviderID and addresses. The safe replacement flow is provider and cluster-tool specific, but it should establish a one-to-one identity before the new kubelet becomes schedulable.

Do not reuse a Node name across two simultaneously live instances. Drain and remove the old Node through the supported lifecycle procedure, verify the backing instance state, and create the replacement through normal automation. Watch for the provider ID and address set to converge before workloads move back.

## Why Manual Status Patches Do Not Last

Node `.status` is continuously reconciled. A manual patch is likely to be overwritten and can mislead operators about the underlying source. It may also route API server-to-kubelet traffic, NodePort traffic, health probes, or monitoring toward an address that the provider integration does not consider valid.

Fix the authoritative source instead:

1. correct the ProviderID source and instance mapping, recreating a Node whose ProviderID is stale;
2. correct the provider's network-selection configuration;
3. correct kubelet node-IP or hostname configuration where applicable;
4. remove duplicate controller writers; and
5. recreate one canary Node to validate clean bootstrap.

After the change, test more than display output:

```bash
kubectl get node "$NODE" -o wide
kubectl get --raw "/api/v1/nodes/$NODE/proxy/healthz"
kubectl get pods -A -o wide --field-selector spec.nodeName="$NODE"
```

The proxied health check requires suitable authorization and control-plane-to-kubelet connectivity. Also test the CNI and provider-prescribed health or NodePort paths from the relevant network; ping alone is not a sufficient application test.

## Official Documentation

- [Kubernetes: Cloud Controller Manager node controller](https://kubernetes.io/docs/concepts/architecture/cloud-controller/#node-controller)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Node Status and addresses](https://kubernetes.io/docs/reference/node/node-status/#addresses)
- [Kubernetes API: NodeStatus](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/#NodeStatus)
- [Kubernetes: Configure kubelet using a configuration file](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/)
- [Kubernetes: IPv4/IPv6 dual-stack](https://kubernetes.io/docs/concepts/services-networking/dual-stack/)

## Conclusion

Wrong Node IPs are usually an identity or network-selection problem. Capture ProviderID, all address types, managed fields, live node interfaces, CCM leadership, and provider inventory. Repair the one-to-one instance mapping and the provider's documented network choice, then validate a fresh Node. Hand-editing `.status.addresses` changes a symptom that active controllers will overwrite.
