# How to Update the Calico BGPPeer Resource Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, BGPPeer, Kubernetes, Networking, Operations, DevOps

Description: Safely update the Calico BGPPeer resource to modify peering sessions without causing BGP session flaps or connectivity disruptions.

---

## Introduction

Updating a BGPPeer resource directly affects live BGP sessions between your Kubernetes nodes and external routers. Changes to the peer IP, AS number, or node selector can cause session teardowns and route withdrawals. In production environments, this translates to temporary loss of external connectivity for pods and services that rely on BGP-advertised routes.

The safest approach to BGPPeer updates depends on what you are changing. Some modifications like adding filters are non-disruptive, while others like changing the peer IP require creating a new peer before removing the old one. Understanding which changes are safe and which require migration is essential for maintaining network stability.

This guide covers safe update procedures for each type of BGPPeer field change, with strategies to avoid session disruption.

## Prerequisites

- Running Kubernetes cluster with Calico and active BGP peering
- `calicoctl` and `kubectl` with cluster-admin access
- Current BGPPeer configurations backed up
- Maintenance window for disruptive changes

## Backing Up Current Peers

Export all existing peer configurations:

```bash
calicoctl get bgppeer -o yaml > bgppeer-backup-all.yaml
```

For a specific peer:

```bash
calicoctl get bgppeer upstream-peer -o yaml > bgppeer-upstream-backup.yaml
```

Record current session status:

```bash
calicoctl node status > bgp-session-status-before.txt
```

## Safe Update: Adding or Changing Filters

Adding or updating filter references is non-disruptive to the BGP session itself. Routes may be withdrawn or added based on the new filter rules, but the session remains established:

```bash
calicoctl patch bgppeer upstream-peer -p '{"spec": {"filters": ["new-export-filter"]}}'
```

Or apply a full resource update:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: upstream-peer
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
  filters:
    - new-export-filter
    - import-restriction-filter
```

```bash
calicoctl apply -f upstream-peer-updated.yaml
```

## Safe Update: Changing the Node Selector

Modifying the nodeSelector changes which nodes participate in the peering session. Nodes removed from the selector will tear down their sessions, and newly matched nodes will establish new sessions:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rack-peer
spec:
  peerIP: 10.1.0.1
  asNumber: 64501
  nodeSelector: rack == 'rack1' || rack == 'rack2'
```

Use a two-step approach for safety:

```bash
# Step 1: Verify which nodes will be affected
kubectl get nodes -l 'rack in (rack1,rack2)'

# Step 2: Apply the updated peer
calicoctl apply -f rack-peer-updated.yaml

# Step 3: Verify new sessions
calicoctl node status
```

## Safe Update: Changing the Peer IP (Migration)

Changing the peer IP is disruptive. Use a migration strategy by creating a new peer before removing the old one:

```bash
# Step 1: Create the new peer alongside the old one
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: upstream-peer-new
spec:
  peerIP: 10.0.0.2
  asNumber: 64501
  filters:
    - external-upstream-filter
EOF

# Step 2: Wait for the new session to establish
watch calicoctl node status

# Step 3: Once established, remove the old peer
calicoctl delete bgppeer upstream-peer
```

## Safe Update: Changing the AS Number

Changing the AS number tears down the existing session. Similar to peer IP changes, use a migration approach:

```bash
# Step 1: Create new peer with updated AS number
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: upstream-peer-new-as
spec:
  peerIP: 10.0.0.1
  asNumber: 64502
  filters:
    - external-upstream-filter
EOF

# Step 2: Verify new session establishes
calicoctl node status

# Step 3: Remove old peer
calicoctl delete bgppeer upstream-peer
```

## Safe Update: Adding Password Authentication

Adding authentication to an existing peer causes a session reset. Coordinate with the remote peer operator to enable authentication on both sides simultaneously:

```bash
# Step 1: Create the secret
kubectl create secret generic bgp-secrets -n calico-system --from-literal=peer-password=SecurePass123

# Step 2: Update the peer (coordinate timing with remote operator)
calicoctl patch bgppeer upstream-peer -p '{
  "spec": {
    "password": {
      "secretKeyRef": {
        "name": "bgp-secrets",
        "key": "peer-password"
      }
    }
  }
}'

# Step 3: Verify session re-establishes
watch calicoctl node status
```

## Verification

After any BGPPeer update, verify:

```bash
# Check all BGP sessions
calicoctl node status

# Compare with pre-update status
diff bgp-session-status-before.txt <(calicoctl node status)

# Verify peer configuration
calicoctl get bgppeer -o wide

# Check calico-node logs for session events
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i "peer\|session\|establish\|reset"

# Test connectivity through BGP-advertised routes
kubectl run test --image=busybox --rm -it --restart=Never -- ping -c 3 <external-ip>
```

## Troubleshooting

If sessions fail to re-establish after an update:

- Restore from backup: `calicoctl apply -f bgppeer-upstream-backup.yaml`
- Check for AS number mismatches between the BGPPeer and the remote router configuration
- Verify firewall rules still allow TCP 179 to the new peer IP
- For password changes, confirm the secret is in the correct namespace: `kubectl get secret bgp-secrets -n calico-system`
- Check if nodeSelector still matches intended nodes: `kubectl get nodes --show-labels | grep rack`
- Review calico-node logs: `kubectl logs -n calico-system -l k8s-app=calico-node | grep -i error`

## Conclusion

Safe BGPPeer updates require understanding which changes are disruptive and which are not. Filter changes are safe, node selector changes are partially disruptive, and peer IP or AS number changes require a migration strategy with parallel peers. Always back up configurations before changes, use the create-then-delete migration pattern for disruptive updates, and verify sessions with `calicoctl node status` after every change.
