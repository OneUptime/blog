# Validating Results After Running calicoctl node status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, BGP, Validation, Kubernetes, Network Health

Description: Learn how to validate and interpret calicoctl node status output to confirm BGP peering health, detect routing anomalies, and verify network policy enforcement paths.

---

## Introduction

The output of `calicoctl node status` tells you about BGP session states, but validating the results means going deeper: confirming that established sessions are actually exchanging routes, that the peer count matches your expected topology, and that the routing table reflects the correct paths.

Simply seeing "Established" next to every peer is necessary but not sufficient. You need to validate that the right number of peers are present, that session durations indicate stability, and that the end-to-end network path is functioning.

## Prerequisites

- A running Kubernetes cluster with Calico
- `calicoctl` and `kubectl` access
- Understanding of your expected cluster topology
- Root access for running calicoctl node status

## Validating Peer Count

```bash
#!/bin/bash
# validate-peer-count.sh

NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
EXPECTED_MESH_PEERS=$((NODE_COUNT - 1))

ACTUAL_PEERS=$(sudo calicoctl node status 2>/dev/null | grep -c "Established" || echo 0)

echo "Cluster nodes: $NODE_COUNT"
echo "Expected mesh peers: $EXPECTED_MESH_PEERS"
echo "Actual established peers: $ACTUAL_PEERS"

if [ "$ACTUAL_PEERS" -eq "$EXPECTED_MESH_PEERS" ]; then
  echo "PASS: Peer count matches expected mesh topology"
elif [ "$ACTUAL_PEERS" -gt "$EXPECTED_MESH_PEERS" ]; then
  echo "INFO: More peers than expected - check for external BGP peers or route reflectors"
else
  echo "FAIL: Missing $((EXPECTED_MESH_PEERS - ACTUAL_PEERS)) peer(s)"
  echo "Missing peers:"
  # Find which nodes are not peered
  ALL_NODE_IPS=$(calicoctl get nodes -o jsonpath='{range .items[*]}{.spec.bgp.ipv4Address}{"\n"}{end}' | cut -d/ -f1)
  PEERED_IPS=$(sudo calicoctl node status | grep "Established" | awk '{print $2}')
  
  for IP in $ALL_NODE_IPS; do
    MY_IP=$(hostname -I | awk '{print $1}')
    if [ "$IP" != "$MY_IP" ] && ! echo "$PEERED_IPS" | grep -q "$IP"; then
      echo "  - $IP (not peered)"
    fi
  done
fi
```

## Validating Session Stability

```bash
#!/bin/bash
# validate-session-stability.sh
# Checks that BGP sessions have been stable (not recently reset)

MIN_UPTIME_MINUTES=10

sudo calicoctl node status | grep "Established" | while read -r line; do
  PEER=$(echo "$line" | awk '{print $2}')
  SINCE=$(echo "$line" | awk '{print $8}')
  
  # The SINCE field is a timestamp like "08:15:30"
  echo "Peer $PEER established since $SINCE"
done

echo ""
echo "Check: If any peer was established very recently, it may indicate flapping."
echo "Compare SINCE times with current time: $(date +%H:%M:%S)"
```

## Validating Route Exchange

Established BGP sessions should result in routes being installed:

```bash
# Check that routes exist for remote pod CIDRs
echo "=== Routes from BGP peers ==="
ip route | grep "proto bird"

# Count routes per peer
echo ""
echo "=== Route count per next-hop ==="
ip route | grep "proto bird" | awk '{for(i=1;i<=NF;i++) if($i=="via") print $(i+1)}' | sort | uniq -c | sort -rn

# Verify routes match the number of remote nodes
ROUTE_NEXTHOPS=$(ip route | grep "proto bird" | awk '{for(i=1;i<=NF;i++) if($i=="via") print $(i+1)}' | sort -u | wc -l)
EXPECTED_PEERS=$(sudo calicoctl node status | grep -c "Established")

echo ""
echo "Unique route next-hops: $ROUTE_NEXTHOPS"
echo "Established BGP peers: $EXPECTED_PEERS"

if [ "$ROUTE_NEXTHOPS" -ge "$EXPECTED_PEERS" ]; then
  echo "PASS: Routes received from all peers"
else
  echo "WARN: Some peers may not be advertising routes"
fi
```

## End-to-End Connectivity Validation

```bash
#!/bin/bash
# validate-e2e-connectivity.sh
# Tests actual pod-to-pod connectivity across nodes

echo "Deploying test pods across nodes..."

NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | head -3)
POD_INDEX=0

for NODE in $NODES; do
  POD_INDEX=$((POD_INDEX + 1))
  kubectl run "connectivity-test-${POD_INDEX}" \
    --image=busybox \
    --restart=Never \
    --overrides="{\"spec\":{\"nodeName\":\"$NODE\"}}" \
    -- sleep 300
done

echo "Waiting for pods to be ready..."
kubectl wait --for=condition=Ready pod -l run --timeout=60s 2>/dev/null

# Test connectivity between each pair
PODS=$(kubectl get pods -l run -o jsonpath='{range .items[*]}{.metadata.name},{.status.podIP}{"\n"}{end}')
echo ""
echo "Testing connectivity..."

IFS=$'\n'
for SRC_LINE in $PODS; do
  SRC_POD=$(echo "$SRC_LINE" | cut -d, -f1)
  for DST_LINE in $PODS; do
    DST_POD=$(echo "$DST_LINE" | cut -d, -f1)
    DST_IP=$(echo "$DST_LINE" | cut -d, -f2)
    if [ "$SRC_POD" != "$DST_POD" ]; then
      if kubectl exec "$SRC_POD" -- ping -c 1 -W 2 "$DST_IP" > /dev/null 2>&1; then
        echo "  $SRC_POD -> $DST_POD ($DST_IP): OK"
      else
        echo "  $SRC_POD -> $DST_POD ($DST_IP): FAIL"
      fi
    fi
  done
done

# Cleanup
echo ""
echo "Cleaning up test pods..."
kubectl delete pods -l run --grace-period=0 2>/dev/null
```

## Verification

Run all validation scripts:

```bash
sudo ./validate-peer-count.sh
sudo ./validate-session-stability.sh
sudo ./validate-e2e-connectivity.sh
```

## Troubleshooting

- **Peer count correct but routes missing**: BIRD may be filtering routes. Check the BIRD configuration inside the calico-node container.
- **Established but connectivity fails**: Check for IP-in-IP or VXLAN encapsulation mismatches. Ensure the tunnel interface is up.
- **Intermittent connectivity**: May indicate asymmetric routing or MTU issues. Test with different packet sizes.
- **Test pods cannot be scheduled**: Check for node taints or resource constraints that prevent scheduling.

## Conclusion

Validating `calicoctl node status` results requires checking beyond the Established state. By verifying peer counts, session stability, route exchange, and actual connectivity, you build confidence that your Calico network is not just configured but actually functioning correctly end-to-end.
