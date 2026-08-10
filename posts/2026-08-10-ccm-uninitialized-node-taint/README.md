# Why Nodes Stay Tainted `node.cloudprovider.kubernetes.io/uninitialized` After Bootstrap

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Node Taints, Bootstrap, Troubleshooting, Cloud Provider

Description: Trace an uninitialized Node from kubelet external-cloud mode through CCM leadership, instance matching, RBAC, credentials, and final taint removal.

---

The taint `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` means Kubernetes is waiting for an external cloud-controller-manager (CCM) to finish the Node's cloud-specific initialization. It is a safety mechanism, not a generic Node readiness error.

A kubelet configured with `--cloud-provider=external` registers without asserting cloud facts it cannot authoritatively know. The CCM must match the Node to an infrastructure instance, populate the provider ID and cloud-derived metadata, and remove the taint. If any part of that path fails, ordinary Pods remain unschedulable on the Node even when the kubelet reports `Ready`.

## Confirm the Exact State

Start with the Node object rather than assuming every scheduling failure has the same cause:

```bash
NODE=worker-1

kubectl get node "$NODE" -o wide
kubectl get node "$NODE" -o jsonpath='{.spec.taints}{"\n"}'
kubectl get node "$NODE" -o jsonpath='{.spec.providerID}{"\n"}'
kubectl get node "$NODE" -o jsonpath='{.status.addresses}{"\n"}'
kubectl get node "$NODE" --show-labels
kubectl describe node "$NODE"
```

An uninitialized Node often also has an empty provider ID, missing region and zone labels, or incomplete addresses. That combination points to failed CCM Node initialization. If the cloud metadata is present and only an unrelated taint blocks scheduling, troubleshoot that taint's owner instead.

Record the Node's creation time and relevant Events. The delay matters: a short interval during normal bootstrap is expected; a taint that persists beyond the provider's normal initialization time is not.

## 1. Verify External Mode Is Intentional

On Kubernetes v1.31 and later, core components accept an empty cloud-provider value or `external`. If the cluster does not use an external CCM—common on conventional bare metal—then setting the kubelet to `external` creates a waiter with no controller that can satisfy it.

Inspect the live process and the provisioning system's source of truth:

```bash
systemctl cat kubelet
ps -ef | grep '[k]ubelet'

kubectl -n kube-system get pod -l component=kube-controller-manager \
  -o jsonpath='{range .items[*].spec.containers[*].command}{.}{"\n"}{end}'
```

For an external CCM, kubelet and `kube-controller-manager` should use the provider's documented external configuration. For no provider, remove external mode through kubeadm, the machine configuration, distribution settings, or other tool that generated the unit. Restart components only through that managed path.

## 2. Find the CCM and Its Current Leader

Pod phase `Running` is not enough. A replica can be a healthy standby while the elected leader is crash-looping or unable to reconcile.

```bash
kubectl get pods -A -o wide | grep -i cloud-controller
kubectl get leases -A | grep -i cloud
kubectl get events -A --sort-by=.lastTimestamp | grep -iE 'cloud|initialize|provider'
```

Use labels from the installed provider manifest rather than assuming a universal label:

```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=cloud-controller-manager \
  --all-containers --since=30m --prefix
```

Look for leader acquisition, failure to get or update Nodes, unknown instance, instance-not-found, unauthorized, forbidden, timeout, rate-limit, or provider-configuration errors. If the provider uses a separate cloud-node-manager, include that component in the inspection.

## 3. Check the Bootstrap Scheduling Trap

The CCM may itself be unable to schedule because every Node has the taint that only the CCM can remove. A provider manifest should tolerate at least the uninitialized taint and, when scheduled on control-plane Nodes, their control-plane taint.

```yaml
tolerations:
  - key: node.cloudprovider.kubernetes.io/uninitialized
    operator: Exists
    effect: NoSchedule
  - key: node-role.kubernetes.io/control-plane
    operator: Exists
    effect: NoSchedule
```

Inspect Pending Pod events:

```bash
kubectl describe pod -n kube-system CCM_POD
```

Also verify its node selector or affinity actually matches a Node, its image can be pulled, and any Secret or ConfigMap volume exists. Use the provider's supported manifest; tolerations alone do not fix an incorrect image, command, service account, or cloud config.

## 4. Separate Kubernetes RBAC from Cloud IAM

Initialization crosses two authorization boundaries:

- Kubernetes RBAC lets the CCM read and patch Nodes, update Node status as required, create Events, and use leader-election Leases.
- Cloud IAM lets the provider component describe instances, networks, addresses, zones, and any other provider resources it implements.

Check the Kubernetes side without guessing:

```bash
SA=system:serviceaccount:kube-system:cloud-controller-manager
kubectl auth can-i get nodes --as="$SA"
kubectl auth can-i patch nodes --as="$SA"
kubectl auth can-i update nodes/status --as="$SA"
kubectl auth can-i get leases.coordination.k8s.io -n kube-system --as="$SA"
kubectl auth can-i update leases.coordination.k8s.io -n kube-system --as="$SA"
```

Use the actual ServiceAccount name and namespace from the Pod. Then inspect cloud audit logs and the provider's documented identity mechanism. A valid Kubernetes token does not grant cloud API access, and a valid instance role does not grant Kubernetes RBAC.

## 5. Prove Node-to-Instance Matching

The controller must map `.metadata.name`, an explicit provider ID, hostname, machine UUID, or another documented identity to exactly one provider instance. Common failures include:

- a hostname override that does not match the provider's expected instance name;
- cloned machines sharing an identity;
- missing cluster or ownership tags;
- the instance living in a different project, account, subscription, region, or endpoint;
- a private API endpoint the CCM cannot reach;
- a stale Node object for a replaced instance; or
- a provider configuration that filters the relevant network or zone.

Compare a working and failing Node:

```bash
kubectl get nodes -o json | jq -r '.items[] | [
  .metadata.name,
  (.spec.providerID // ""),
  ([.metadata.labels["topology.kubernetes.io/region"],
    .metadata.labels["topology.kubernetes.io/zone"]] | join("/")),
  ([.status.addresses[]? | .type + "=" + .address] | join(","))
] | @tsv'
```

Correlate the Node name and instance identifier with provider inventory and audit logs. Do not invent a provider ID by copying a sibling and changing a suffix; formats and canonicalization are provider contracts.

## 6. Check API Reachability, Time, and Throttling

A controller can start and lead while failing every provider call. Confirm DNS, TLS trust, proxy and `NO_PROXY` rules, firewall policy, the configured API endpoint, and clock synchronization. Short-lived identity tokens can appear invalid when control-plane time is wrong.

Rate limiting is different from denial. Repeated HTTP 429 responses or client-side throttling indicate that credentials may be valid but reconciliation cannot finish within the expected time. Reduce duplicate controllers or excessive polling, correct scope, and tune only provider-supported rate settings after measuring demand.

## Do Not Remove the Taint as the First Fix

This command changes scheduling state but does not complete cloud initialization:

```bash
kubectl taint node "$NODE" node.cloudprovider.kubernetes.io/uninitialized-
```

It can allow Pods to schedule without correct topology, addresses, or identity, and may conceal a provider-wide bootstrap failure. It is defensible only as a controlled recovery decision after determining that external cloud initialization is not required, correcting the component configuration, and assessing workloads that may depend on cloud metadata. Record the intervention and verify that the taint does not return on replacement Nodes.

The durable success criteria are:

```bash
kubectl get node "$NODE" -o jsonpath='{.spec.providerID}{"\n"}'
kubectl get node "$NODE" -o jsonpath='{.spec.taints}{"\n"}'
kubectl get node "$NODE" -L topology.kubernetes.io/region,topology.kubernetes.io/zone
```

Then create one replacement test Node through the real provisioning path. Existing Nodes becoming healthy does not prove future bootstrap works.

## Official Documentation

- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: The CCM chicken-and-egg problem](https://kubernetes.io/blog/2025/02/14/cloud-controller-manager-chicken-egg-problem/)
- [Kubernetes: Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Removed cloud-provider feature gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/)

## Conclusion

The uninitialized taint persists because the external CCM has not successfully completed Node initialization. Verify that external mode is intended, find the elected controller, prove it can schedule, separate RBAC from cloud IAM, and validate the exact Node-to-instance mapping. Fix that path and let the controller remove the taint; manual removal is a scheduling bypass, not a cloud-initialization repair.
