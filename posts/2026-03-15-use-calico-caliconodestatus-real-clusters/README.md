# How to Use the Calico CalicoNodeStatus Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, CalicoNodeStatus, Monitoring, Kubernetes, BGP, Production, Observability

Description: Practical guide to using CalicoNodeStatus resources for monitoring and troubleshooting node networking in production Kubernetes clusters.

---

## Introduction

In production Kubernetes clusters, understanding the networking state of each node is critical for maintaining reliable connectivity. The CalicoNodeStatus resource surfaces BGP session health, learned routes, and agent status directly through the Kubernetes API, making it accessible to existing monitoring and alerting pipelines.

Rather than relying on SSH access to individual nodes or parsing logs from calico-node pods, CalicoNodeStatus provides a structured, queryable view of each node's networking state. This is especially valuable in large clusters where manually inspecting nodes is impractical.

This guide demonstrates real-world patterns for using CalicoNodeStatus in production, including integration with monitoring systems, automated health checks, and incident response workflows.

## Prerequisites

- A production Kubernetes cluster running Calico v3.20 or later
- Calico BGP networking enabled on Linux nodes
- Calico API resources available through `kubectl`
- `calicoctl` installed and configured for node-local checks
- `kubectl` with cluster-admin access
- BGP peering configured between nodes or with external routers

## Setting Up Targeted Status Monitoring

Deploy CalicoNodeStatus resources for the nodes you want to inspect using a script. Keep the number of active resources small, especially with short update intervals:

```bash
NODES="node01 node02"

for node in $NODES; do
cat <<EOF | kubectl apply -f -
apiVersion: projectcalico.org/v3
kind: CalicoNodeStatus
metadata:
  name: ${node}-status
spec:
  node: ${node}
  classes:
    - Agent
    - BGP
    - Routes
  updatePeriodSeconds: 60
EOF
done
```

## Checking BGP Session Health

Query BGP session status across all active CalicoNodeStatus resources:

```bash
for status in $(kubectl get caliconodestatus -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== $status ==="
  kubectl get caliconodestatus "$status" -o yaml | grep -A 20 "bgp:"
done
```

Look for peers with state other than `Established`, which indicates a problem:

```bash
kubectl get caliconodestatus node01-status \
  -o jsonpath='{range .status.bgp.peersV4[*]}{.peerIP}{" "}{.state}{"\n"}{end}{range .status.bgp.peersV6[*]}{.peerIP}{" "}{.state}{"\n"}{end}' \
  | grep -v ' Established$'
```

## Monitoring Route Table Size

Track the number of routes learned by each node to detect route leaks or missing routes:

```bash
for status in $(kubectl get caliconodestatus -o jsonpath='{.items[*].metadata.name}'); do
  routes=$(kubectl get caliconodestatus "$status" -o yaml | grep -c "destination:")
  echo "$status: $routes routes"
done
```

## Building a Health Check Script

Create an automated health check that can run in CI or as a CronJob:

```bash
#!/bin/bash
FAILURES=0

for status in $(kubectl get caliconodestatus -o jsonpath='{.items[*].metadata.name}'); do
  # Check for non-established BGP peers
  bad_peers=$(
    kubectl get caliconodestatus "$status" \
      -o jsonpath='{range .status.bgp.peersV4[*]}{.state}{"\n"}{end}{range .status.bgp.peersV6[*]}{.state}{"\n"}{end}' \
      | grep -vc '^Established$' || true
  )
  if [ "$bad_peers" -gt 0 ]; then
    echo "ALERT: $status has $bad_peers non-established BGP peers"
    FAILURES=$((FAILURES + 1))
  fi
done

if [ "$FAILURES" -gt 0 ]; then
  echo "Health check failed with $FAILURES issues"
  exit 1
fi
echo "All nodes healthy"
```

## Using Status Data for Incident Response

During a network incident, increase the update frequency on affected nodes:

```bash
kubectl patch caliconodestatus node01-status --type=merge -p '{"spec":{"updatePeriodSeconds":10}}'
```

Compare BGP peer counts between a healthy node and the problematic node:

```bash
echo "=== Healthy Node ==="
kubectl get caliconodestatus healthy-node-status -o yaml | grep -A 20 "peersV4"
echo "=== Problem Node ==="
kubectl get caliconodestatus problem-node-status -o yaml | grep -A 20 "peersV4"
```

After the incident, reset the update interval:

```bash
kubectl patch caliconodestatus node01-status --type=merge -p '{"spec":{"updatePeriodSeconds":60}}'
```

## Cleaning Up Status Resources for Removed Nodes

Periodically clean up CalicoNodeStatus resources for nodes that no longer exist:

```bash
for status in $(kubectl get caliconodestatus -o jsonpath='{.items[*].metadata.name}'); do
  node=$(kubectl get caliconodestatus "$status" -o jsonpath='{.spec.node}')
  if ! kubectl get node "$node" &>/dev/null; then
    echo "Removing stale status for $node"
    kubectl delete caliconodestatus "$status"
  fi
done
```

## Verification

Verify your target nodes have corresponding CalicoNodeStatus resources:

```bash
for node in $NODES; do
  kubectl get caliconodestatus "${node}-status" \
    -o jsonpath='{.metadata.name}{" -> "}{.spec.node}{"\n"}'
done
```

Confirm status data is fresh:

```bash
kubectl get caliconodestatus -o yaml | grep "lastUpdated"
```

## Troubleshooting

If status data is missing for some nodes, check that calico-node is running on those nodes:

```bash
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide --no-headers | awk '{print $7}' | sort > /tmp/calico-nodes.txt
kubectl get nodes --no-headers | awk '{print $1}' | sort > /tmp/all-nodes.txt
diff /tmp/all-nodes.txt /tmp/calico-nodes.txt
```

If BGP status shows zero peers on a node that should have peering, run the node-local BGP status check on that node:

```bash
sudo calicoctl node status
```

## Conclusion

CalicoNodeStatus resources provide essential visibility into node-level networking state in production clusters. By deploying them for the nodes you are actively investigating with appropriate update intervals, you can integrate Calico network health into your existing monitoring workflows, speed up incident response, and proactively detect BGP and routing issues before they affect workloads.
