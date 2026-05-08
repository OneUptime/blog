# How to Update the Calico IPPool Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPPool, Kubernetes, Networking, IPAM, Migration, DevOps

Description: Safely update Calico IPPool resources without disrupting running workloads or losing pod connectivity.

---

## Introduction

Modifying an active IPPool in Calico requires careful planning because pods already have IPs assigned from the pool. Changing the CIDR or altering encapsulation affects how workloads are allocated or routed, while disabling a pool prevents only new allocations. A careless update can cause network outages, IP conflicts, or orphaned allocations.

The safest approach depends on which fields you need to change. Some fields like natOutgoing and encapsulation can be updated in place, while changing the CIDR requires creating a new pool and migrating workloads. Understanding these distinctions prevents downtime.

This guide covers safe update strategies for common IPPool fields, including rollback procedures for when things go wrong.

## Prerequisites

- A Kubernetes cluster with Calico installed and at least one active IPPool
- `kubectl` and `calicoctl` configured with cluster admin access
- Understanding of your current IPPool configuration
- A maintenance window for disruptive changes

## Identifying Safe vs Disruptive Changes

Fields that can be updated in place without disruption:

- **natOutgoing**: Toggle NAT behavior immediately
- **ipipMode** / **vxlanMode**: Change tunnel mode (may cause brief packet loss)
- **nodeSelector**: Modify which nodes use the pool
- **disabled**: Prevent new allocations without affecting existing pods

Fields that require migration:

- **cidr**: Cannot be changed on an existing pool
- **blockSize**: Cannot be changed on an existing pool

## Updating natOutgoing Safely

To toggle NAT behavior, edit the resource directly:

```bash
calicoctl get ippool default-ipv4-pool -o yaml > ippool-backup.yaml
```

Modify the natOutgoing field:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-pool
spec:
  cidr: 10.244.0.0/16
  vxlanMode: CrossSubnet
  natOutgoing: false
  nodeSelector: all()
  blockSize: 26
```

Apply the change:

```bash
calicoctl apply -f ippool-updated.yaml
```

This takes effect immediately for new connections. Existing connections continue with their original NAT state until they are re-established.

## Changing Encapsulation Mode

Switching encapsulation modes can cause brief packet loss while routes and tunnel programming converge, so make the change during a maintenance window:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-pool
spec:
  cidr: 10.244.0.0/16
  vxlanMode: Always
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
```

Apply the change and monitor calico-node health. If your deployment does not converge cleanly, restart the calico-node DaemonSet in the namespace where it is installed:

```bash
calicoctl apply -f ippool-vxlan.yaml
kubectl rollout restart daemonset calico-node -n calico-system
kubectl rollout status daemonset calico-node -n calico-system
```

## Migrating to a New CIDR

Since CIDR cannot be changed in place, create a new pool and migrate. Verify first that the cluster uses Calico IPAM, and keep the new pool inside the Kubernetes cluster CIDR:

```bash
# Step 1: Create the new pool

cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: new-ipv4-pool
spec:
  cidr: 10.248.0.0/16
  vxlanMode: CrossSubnet
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
EOF

# Step 2: Disable the old pool
calicoctl patch ippool default-ipv4-pool -p '{"spec": {"disabled": true}}'

# Step 3: Restart workloads to get new IPs
kubectl rollout restart deployment -n my-namespace
```

Wait for all pods from the old pool to be recreated with IPs from the new pool before deleting the old one.

## Updating Node Selectors

Narrow or broaden which nodes use a pool:

```bash
calicoctl patch ippool zone-a-pool -p \
  '{"spec": {"nodeSelector": "topology.kubernetes.io/zone == \"us-east-1a\" && node-role.kubernetes.io/worker == \"true\""}}'
```

Existing pods on nodes that no longer match keep their IPs until restarted.

## Verification

After any IPPool update, verify the cluster state:

```bash
# Check pool configuration
calicoctl get ippools -o wide

# Verify IPAM allocations
calicoctl ipam show
calicoctl ipam show --show-blocks

# Check for pods with IPs outside active pools
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.podIP}{"\n"}{end}'

# Confirm calico-node is healthy
kubectl get pods -n calico-system -l k8s-app=calico-node
```

## Troubleshooting

- If pods lose connectivity after tunnel mode changes, verify all calico-node pods have restarted with `kubectl get pods -n calico-system -l k8s-app=calico-node -o wide`
- If new pods are not getting IPs after disabling a pool, ensure the replacement pool exists and is not disabled
- For CIDR migration, check that old pool blocks are released before deleting the old pool
- If a rollback is needed, re-enable the old pool immediately: `calicoctl patch ippool default-ipv4-pool -p '{"spec": {"disabled": false}}'`
- Always keep backups of pool configurations before making changes

## Conclusion

Updating Calico IPPool resources safely requires understanding which fields support in-place changes and which require migration. Always back up existing configurations, test changes in a non-production environment first, and have a rollback plan ready. For CIDR changes, the disable-and-migrate pattern keeps existing pod connectivity intact when executed correctly, though restarted workloads may still see normal application-level interruption.
