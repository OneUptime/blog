# How to Simulate Network Partitions for Ceph Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Testing, Network, Chaos Engineering, Resilience

Description: Simulate network partitions in Ceph clusters using tc, iptables, and chaos engineering tools to test split-brain handling and monitor recovery behavior.

---

Network partitions are among the most challenging failure scenarios for distributed storage systems. Testing how Ceph handles split-brain conditions, monitor quorum loss, and OSD network isolation builds confidence in your disaster recovery procedures.

## Understanding Ceph's Network Partition Behavior

Ceph uses monitor quorum to make cluster decisions. When a partition isolates monitors:
- Majority partition: cluster remains available
- Minority partition: stops serving writes (preserves consistency)
- OSD partition: OSDs marked down after `mon_osd_report_timeout`

## Method 1: Using iptables to Block Traffic

```bash
#!/bin/bash
# partition-node.sh - Isolate a node from the cluster

TARGET_NODE="${1:?Target node required}"
DIRECTION="${2:-both}"  # in, out, or both
NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"

# Get the node IP
NODE_IP=$(kubectl get node "$TARGET_NODE" \
  -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')

echo "Partitioning node $TARGET_NODE ($NODE_IP)"

# Get cluster node IPs (all other nodes)
CLUSTER_IPS=$(kubectl get nodes -o json | python3 -c "
import sys, json
nodes = json.load(sys.stdin)['items']
for n in nodes:
    for addr in n['status'].get('addresses', []):
        if addr['type'] == 'InternalIP':
            print(addr['address'])
")

# Apply iptables rules on the target node
for ip in $CLUSTER_IPS; do
  if [[ "$ip" != "$NODE_IP" ]]; then
    if [[ "$DIRECTION" == "in" || "$DIRECTION" == "both" ]]; then
      kubectl debug node/"$TARGET_NODE" --profile=sysadmin --image=nicolaka/netshoot -- \
        sh -c "iptables -A INPUT -s $ip -j DROP" 2>/dev/null || true
    fi
    if [[ "$DIRECTION" == "out" || "$DIRECTION" == "both" ]]; then
      kubectl debug node/"$TARGET_NODE" --profile=sysadmin --image=nicolaka/netshoot -- \
        sh -c "iptables -A OUTPUT -d $ip -j DROP" 2>/dev/null || true
    fi
  fi
done

echo "Node $TARGET_NODE is now partitioned"
echo "Monitor quorum status:"
kubectl -n "$NAMESPACE" exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status --format json | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Quorum members:', d.get('quorum_names'))
print('All monitors:', list(d['monmap']['mons']))
"
```

## Method 2: Using tc (Traffic Control) for Degraded Networks

```bash
#!/bin/bash
# degrade-network.sh - Add latency and packet loss

TARGET_NODE="$1"
LATENCY_MS="${2:-100}"
PACKET_LOSS_PCT="${3:-10}"
INTERFACE="${4:-eth0}"

echo "Adding ${LATENCY_MS}ms latency and ${PACKET_LOSS_PCT}% packet loss on $TARGET_NODE"

# Access node via privileged pod
kubectl run netdegrader \
  --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"'$TARGET_NODE'","hostNetwork":true}}' \
  --rm -it -- \
  tc qdisc add dev "$INTERFACE" root netem \
    delay "${LATENCY_MS}ms" \
    loss "${PACKET_LOSS_PCT}%"

# Monitor OSD status during degraded network
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
watch -n 2 'ceph osd stat; echo; ceph health detail'
"
```

## Method 3: Using Chaos Mesh for Kubernetes

Chaos Mesh provides Kubernetes-native network chaos injection:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: ceph-mon-partition
  namespace: rook-ceph
spec:
  action: partition
  mode: one
  selector:
    namespaces:
      - rook-ceph
    labelSelectors:
      app: rook-ceph-mon
  direction: both
  target:
    mode: all
    selector:
      namespaces:
        - rook-ceph
      labelSelectors:
        app: rook-ceph-mon
  duration: "60s"
```

```yaml
# Network delay for RGW
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: rgw-latency
  namespace: rook-ceph
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - rook-ceph
    labelSelectors:
      app: rook-ceph-rgw
  delay:
    latency: "200ms"
    correlation: "25"
    jitter: "50ms"
  duration: "120s"
```

## Monitoring During Partition Tests

```bash
#!/bin/bash
# monitor-partition.sh - Track cluster state during partition

NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"
INTERVAL=5
LOG_FILE="partition-test-$(date +%Y%m%d-%H%M%S).log"

echo "Monitoring Ceph during partition test. Log: $LOG_FILE"

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  HEALTH=$(kubectl -n "$NAMESPACE" exec -it deploy/rook-ceph-tools -- \
    ceph health --format json 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])" 2>/dev/null)
  QUORUM=$(kubectl -n "$NAMESPACE" exec -it deploy/rook-ceph-tools -- \
    ceph quorum_status --format json 2>/dev/null | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['quorum_names'])" 2>/dev/null)

  LOG_ENTRY="[$TIMESTAMP] Health: $HEALTH | Quorum: $QUORUM"
  echo "$LOG_ENTRY" | tee -a "$LOG_FILE"
  sleep "$INTERVAL"
done
```

## Restoring Network Connectivity

```bash
# Remove iptables rules after test
kubectl debug node/"$TARGET_NODE" --profile=sysadmin --image=nicolaka/netshoot -- \
  sh -c "iptables -F INPUT; iptables -F OUTPUT"

# Remove tc rules
kubectl run netrestore \
  --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"'$TARGET_NODE'","hostNetwork":true}}' \
  --rm -it -- \
  tc qdisc del dev eth0 root

# Verify cluster recovery
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

## Summary

Network partition testing using iptables, tc, or Chaos Mesh validates how your Ceph cluster handles split-brain conditions and degraded connectivity. Monitoring quorum status, OSD state, and client I/O throughput during tests reveals how quickly Ceph detects and recovers from network failures, helping you tune timeouts and build more resilient deployments.
