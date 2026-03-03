# How to Upgrade Talos Linux with Zero Downtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Zero Downtime, Upgrade Strategy, High Availability, Kubernetes

Description: A detailed guide to upgrading Talos Linux clusters with zero downtime using rolling upgrades, proper pod disruption budgets, and high availability configurations.

---

Upgrading your Talos Linux cluster without causing downtime for your applications requires careful planning and the right cluster architecture. True zero downtime upgrades are possible when your cluster has sufficient redundancy and your applications are designed for high availability. This guide walks you through the requirements, strategies, and practical steps.

## Prerequisites for Zero Downtime Upgrades

Zero downtime is not just about how you run the upgrade. It requires that your cluster and applications are set up correctly from the start.

### Cluster Architecture Requirements

**Multiple control plane nodes** - You need at least three control plane nodes. When one is being upgraded, the other two maintain etcd quorum and API server availability.

**Sufficient worker nodes** - You need enough worker nodes to handle all workloads even when one or more nodes are being upgraded. If your cluster has four worker nodes and each runs at 70% capacity, removing one node puts the remaining three at 93% capacity - which is cutting it close.

```bash
# Check current resource usage
kubectl top nodes

# Check allocatable vs requested resources
kubectl describe nodes | grep -A 10 "Allocated resources"
```

**Load balancer for the control plane** - A load balancer (or VIP) in front of the API server endpoints ensures that clients can always reach the API server even when one control plane node is down.

### Application Requirements

**Multiple replicas** - Applications must run with more than one replica. A single-replica deployment will always have downtime during a node upgrade, no matter how carefully you handle it.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3  # Must be > 1 for zero downtime
  selector:
    matchLabels:
      app: web-app
  template:
    spec:
      # Anti-affinity to spread pods across nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - web-app
                topologyKey: kubernetes.io/hostname
```

**Pod Disruption Budgets** - PDBs ensure that the drain process never takes down too many pods at once:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 2  # Always keep at least 2 pods running
  selector:
    matchLabels:
      app: web-app
```

**Graceful shutdown handling** - Applications should handle SIGTERM gracefully, finishing in-flight requests before shutting down:

```yaml
spec:
  terminationGracePeriodSeconds: 60  # Give the app time to drain
  containers:
    - name: web-app
      lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 10"]  # Allow LB to stop sending traffic
```

**Health probes** - Readiness probes ensure that traffic is not sent to pods that are not ready:

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

## The Zero Downtime Upgrade Process

### Step 1: Pre-Upgrade Verification

```bash
# Verify cluster health
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Verify all PDBs are in place
kubectl get pdb --all-namespaces

# Check that critical apps have multiple replicas
kubectl get deployments --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
REPLICAS:.spec.replicas | sort -t' ' -k3 -n

# Take etcd snapshot
talosctl etcd snapshot /tmp/etcd-pre-upgrade.snapshot --nodes 192.168.1.10
```

### Step 2: Upgrade Control Plane Nodes

Upgrade control plane nodes one at a time. With three control plane nodes, you always maintain quorum:

```bash
# Upgrade first control plane node
echo "Upgrading control plane node 1..."
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to rejoin
talosctl health --nodes 192.168.1.10 --wait-timeout 10m

# Verify etcd quorum is intact
talosctl etcd status --nodes 192.168.1.11  # Check from a healthy node
talosctl etcd members --nodes 192.168.1.11

# Verify API server is responsive
kubectl get nodes

# Proceed to next control plane node
echo "Upgrading control plane node 2..."
talosctl upgrade --nodes 192.168.1.11 \
  --image ghcr.io/siderolabs/installer:v1.7.0

talosctl health --nodes 192.168.1.11 --wait-timeout 10m
talosctl etcd status --nodes 192.168.1.12

# And the third
echo "Upgrading control plane node 3..."
talosctl upgrade --nodes 192.168.1.12 \
  --image ghcr.io/siderolabs/installer:v1.7.0

talosctl health --nodes 192.168.1.12 --wait-timeout 10m
```

During this process, the Kubernetes API remains available because at least two control plane nodes are always running.

### Step 3: Upgrade Worker Nodes

For worker nodes, the drain-upgrade-uncordon cycle ensures workloads are migrated cleanly:

```bash
#!/bin/bash
# Zero downtime worker upgrade

WORKERS=("192.168.1.20" "192.168.1.21" "192.168.1.22" "192.168.1.23")
TALOS_IMAGE="ghcr.io/siderolabs/installer:v1.7.0"

for NODE in "${WORKERS[@]}"; do
  HOSTNAME=$(talosctl get hostname --nodes "$NODE" -o json | jq -r '.spec.hostname')
  echo "Processing $HOSTNAME ($NODE)..."

  # Step A: Drain the node
  # PDBs will prevent the drain from removing too many pods at once
  echo "  Draining $HOSTNAME..."
  kubectl drain "$HOSTNAME" \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --timeout=600s

  # Step B: Verify workloads migrated successfully
  echo "  Checking pod status..."
  kubectl get pods --all-namespaces --field-selector spec.nodeName="$HOSTNAME"
  # Should only show DaemonSet pods

  # Step C: Upgrade the node
  echo "  Upgrading $NODE..."
  talosctl upgrade --nodes "$NODE" --image "$TALOS_IMAGE"

  # Step D: Wait for the node to come back
  echo "  Waiting for $NODE..."
  sleep 30
  talosctl health --nodes "$NODE" --wait-timeout 5m

  # Step E: Uncordon the node
  echo "  Uncordoning $HOSTNAME..."
  kubectl uncordon "$HOSTNAME"

  # Step F: Wait for pods to be scheduled and become ready
  echo "  Waiting for pods to stabilize..."
  sleep 30

  # Step G: Verify everything is healthy
  kubectl get nodes
  echo "  $HOSTNAME upgraded successfully"
  echo ""
done
```

## Handling StatefulSets

StatefulSets require extra care because they have ordered pod management and persistent storage:

```yaml
# Ensure StatefulSets have PDBs
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
spec:
  maxUnavailable: 1  # Only allow one pod down at a time
  selector:
    matchLabels:
      app: database
```

For databases like PostgreSQL or MySQL with primary-replica setups, make sure replicas are promoted before draining the primary's node. Most database operators handle this automatically, but verify it is working.

## Load Balancer Considerations

External traffic reaching your cluster should be handled by a load balancer or ingress controller that is aware of node availability:

```yaml
# Ingress controller with anti-affinity to spread across nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app.kubernetes.io/name
                    operator: In
                    values:
                      - ingress-nginx
              topologyKey: kubernetes.io/hostname
```

With ingress controller pods spread across multiple nodes and a PDB ensuring at least two are always running, external traffic continues flowing even during upgrades.

## Monitoring During Upgrades

Set up real-time monitoring during the upgrade to catch any issues immediately:

```bash
# Terminal 1: Watch node status
watch -n 5 'kubectl get nodes'

# Terminal 2: Watch pod status
watch -n 5 'kubectl get pods --all-namespaces | grep -v Running | grep -v Completed'

# Terminal 3: Monitor application health (adjust URL as needed)
watch -n 2 'curl -s -o /dev/null -w "%{http_code}" https://your-app.example.com/healthz'
```

If you have external monitoring (like OneUptime, Datadog, or Prometheus), set up additional alerts for the upgrade window:

```yaml
# Temporary alert rule for upgrade monitoring
- alert: UpgradeHealthCheck
  expr: up{job="kubernetes-nodes"} == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Node {{ $labels.instance }} has been down for 5 minutes during upgrade"
```

## Common Pitfalls That Cause Downtime

**Single replica deployments** - If an app has only one pod, it will be unavailable while the node reboots. Audit your deployments before the upgrade.

**Missing PDBs** - Without PDBs, the drain can evict all pods of an application simultaneously.

**Insufficient cluster capacity** - If remaining nodes cannot handle the load from the drained node, pods will be pending and unavailable.

**Long graceful shutdown periods** - If pods take too long to shut down, the drain timeout may be exceeded, leaving pods in a terminating state.

**Node affinity rules that are too strict** - If pods can only run on specific nodes, draining that node leaves them unschedulable.

```bash
# Find deployments with only one replica
kubectl get deployments --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.replicas == 1) |
    "\(.metadata.namespace)/\(.metadata.name): \(.spec.replicas) replica"'

# Find deployments without PDBs
# (Compare deployment labels with PDB selectors)
```

## Verifying Zero Downtime

To verify that your upgrade truly achieved zero downtime, use external health checks that run continuously during the process:

```bash
# Simple availability check script
#!/bin/bash
ENDPOINT="https://your-app.example.com/healthz"
LOG_FILE="/tmp/upgrade-availability.log"

while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$ENDPOINT")
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  echo "$TIMESTAMP - $STATUS" >> "$LOG_FILE"

  if [ "$STATUS" != "200" ]; then
    echo "DOWNTIME DETECTED at $TIMESTAMP - Status: $STATUS"
  fi

  sleep 1
done
```

Run this script before, during, and after the upgrade. If you see no non-200 responses, you achieved zero downtime.

## Conclusion

Zero downtime upgrades in Talos Linux are achievable with the right preparation. The requirements are straightforward: redundant control plane, sufficient worker capacity, multi-replica applications, Pod Disruption Budgets, and proper health probes. The upgrade process itself follows a disciplined rolling pattern - upgrade control plane nodes one at a time, then drain and upgrade worker nodes one at a time. With monitoring in place to catch issues early and a rollback plan ready, you can upgrade your entire Talos cluster without your users noticing a thing.
