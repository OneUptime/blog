# How to Update the Calico HostEndpoint Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, HostEndpoint, Kubernetes, Node Security, Change Management

Description: Safely update Calico HostEndpoint resources without losing node connectivity or disrupting cluster operations.

---

## Introduction

Updating a Calico HostEndpoint is a high-risk operation because incorrect changes can sever connectivity to the node. Since HostEndpoints control traffic at the host interface level, a misconfigured update can block SSH, kubelet communication, and even pod networking on that node.

Safe updates require careful planning: backing up the current state, understanding which policies target the HostEndpoint, making changes incrementally, and having a rollback plan ready. Unlike pod-level policies, HostEndpoint mistakes can make nodes completely unreachable from the network.

This guide walks through safe update procedures for HostEndpoint resources, covering label changes, interface migrations, IP updates, and bulk modifications.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- Console access to nodes as a safety net
- Existing HostEndpoint resources

## Backing Up Before Changes

Always export the current HostEndpoint configuration before making changes:

```bash
calicoctl get hostendpoint worker-1-eth0 -o yaml > worker-1-hep-backup.yaml
```

Back up all HostEndpoints at once:

```bash
calicoctl get hostendpoint -o yaml > all-hep-backup.yaml
```

Also export policies that reference HostEndpoint labels:

```bash
calicoctl get globalnetworkpolicy -o yaml > gnp-backup.yaml
```

## Updating Labels Safely

Changing labels on a HostEndpoint alters which policies apply to it. First, identify policies that use the current labels:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep "node-role"
```

Update the label only after confirming it will not remove the node from essential allow policies:

```yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: worker-1-eth0
  labels:
    node-role: worker
    environment: production
    maintenance-window: active
spec:
  node: worker-1
  interfaceName: eth0
  expectedIPs:
    - 10.0.1.10
```

```bash
calicoctl replace -f worker-1-hep-updated.yaml
```

## Updating Expected IPs

When a node IP changes, update the expectedIPs field. Apply while you still have connectivity:

```yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: worker-1-eth0
  labels:
    node-role: worker
    environment: production
spec:
  node: worker-1
  interfaceName: eth0
  expectedIPs:
    - 10.0.1.20
```

```bash
calicoctl replace -f worker-1-hep-newip.yaml
```

## Migrating to a New Interface

If the node interface changes (for example from eth0 to ens192), create the new HostEndpoint before removing the old one:

```bash
# Step 1: Create new HostEndpoint
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: worker-1-ens192
  labels:
    node-role: worker
    environment: production
spec:
  node: worker-1
  interfaceName: ens192
  expectedIPs:
    - 10.0.1.10
EOF

# Step 2: Verify connectivity still works
kubectl get node worker-1

# Step 3: Remove old HostEndpoint
calicoctl delete hostendpoint worker-1-eth0
```

## Updating Multiple Nodes in a Rolling Fashion

When updating HostEndpoints across multiple nodes, process them one at a time:

```bash
for node in worker-1 worker-2 worker-3; do
  echo "Updating $node..."
  calicoctl get hostendpoint ${node}-eth0 -o yaml | \
    sed 's/environment: staging/environment: production/' | \
    calicoctl replace -f -

  # Verify node is still responsive
  kubectl get node $node
  sleep 10
done
```

## Verification

After each update, verify the HostEndpoint:

```bash
calicoctl get hostendpoint worker-1-eth0 -o yaml
```

Confirm the node is still reachable:

```bash
kubectl get node worker-1 -o wide
kubectl exec -it $(kubectl get pod -n calico-system -l k8s-app=calico-node --field-selector spec.nodeName=worker-1 -o jsonpath='{.items[0].metadata.name}') -n calico-system -- calico-node -felix-live
```

Check that existing policies still apply:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -B2 "node-role"
```

## Troubleshooting

If a node becomes unreachable after an update, use console access to restore the backup:

```bash
calicoctl apply -f worker-1-hep-backup.yaml
```

Check if failsafe ports are still allowing critical traffic:

```bash
calicoctl get felixconfiguration default -o yaml | grep -A15 "failsafe"
```

If the expectedIPs do not match the actual node IP, Felix may not apply rules correctly. Verify the IP:

```bash
kubectl get node worker-1 -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}'
```

Review Felix logs for HostEndpoint processing errors:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=30 | grep -i "hostendpoint"
```

## Conclusion

HostEndpoint updates carry significant risk because they affect node-level connectivity. Always back up before changes, use `calicoctl replace` for atomic updates, process nodes one at a time in rolling updates, and maintain console access as a safety net. Verify connectivity after each change before proceeding to the next node.
