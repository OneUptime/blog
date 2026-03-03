# How to Manage Cluster Upgrades with Zero Downtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Zero Downtime, Cluster Upgrade, High Availability

Description: A practical guide to upgrading Talos Linux clusters with zero downtime using rolling updates, pod disruption budgets, and proper sequencing strategies.

---

Upgrading a production Kubernetes cluster is one of those tasks that makes even experienced engineers nervous. The stakes are high - a botched upgrade can take down applications and impact users. But with proper planning and the right approach, you can upgrade your Talos Linux clusters without any downtime at all. This guide covers the techniques and procedures you need to make zero-downtime upgrades a reality.

## What Zero Downtime Actually Means

Let us be clear about what zero downtime means in this context. It does not mean that every individual component is always running during the upgrade. Individual nodes will be taken down and rebooted. Instead, zero downtime means that your applications continue to serve traffic without interruption throughout the upgrade process. Users never see an error page, API calls never fail, and background jobs continue processing.

This requires:

- Redundancy at every layer (multiple replicas of applications)
- Proper traffic management (load balancing, health checks)
- Careful sequencing of upgrades
- Pod Disruption Budgets to prevent over-eviction

## Prerequisites for Zero-Downtime Upgrades

Before you can achieve zero-downtime upgrades, your cluster and applications need to be set up correctly.

### Application Redundancy

Every application that needs to stay available must have at least 2 replicas, preferably 3 or more:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Spread pods across nodes
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: my-app
      containers:
      - name: app
        image: my-app:latest
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

### Pod Disruption Budgets

PDBs tell Kubernetes how many pods of an application can be unavailable during voluntary disruptions like node drains:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2  # At least 2 pods must always be running
  selector:
    matchLabels:
      app: my-app
```

Set up PDBs for every critical application before starting the upgrade.

### Control Plane Redundancy

You need at least 3 control plane nodes for zero-downtime upgrades. With 3 nodes, etcd can tolerate 1 node being down:

```bash
# Verify you have 3+ control plane nodes
kubectl get nodes -l node-role.kubernetes.io/control-plane

# Verify etcd has 3+ members
talosctl etcd members -n <control-plane-ip>
```

## The Upgrade Sequence

The order in which you upgrade components matters. Here is the recommended sequence for Talos Linux:

1. Upgrade Talos OS on control plane nodes (one at a time)
2. Upgrade Kubernetes control plane components
3. Upgrade Talos OS on worker nodes (in batches)
4. Upgrade any add-ons (CNI, storage drivers, etc.)

### Phase 1: Control Plane Talos Upgrade

Upgrade control plane nodes one at a time. After each node, verify the cluster is fully healthy before moving on.

```bash
#!/bin/bash
# upgrade-control-plane.sh

TARGET_IMAGE="ghcr.io/siderolabs/installer:v1.9.1"
CP_NODES=("10.0.0.1" "10.0.0.2" "10.0.0.3")

for cp_ip in "${CP_NODES[@]}"; do
    cp_name=$(kubectl get nodes -o wide --no-headers | grep "$cp_ip" | awk '{print $1}')
    echo "Upgrading control plane node: $cp_name ($cp_ip)"

    # Take an etcd snapshot before each CP upgrade
    talosctl etcd snapshot "/tmp/etcd-before-$cp_name.db" -n "$cp_ip"

    # Drain the node
    kubectl drain "$cp_name" \
        --ignore-daemonsets \
        --delete-emptydir-data \
        --timeout=300s

    # Upgrade Talos
    talosctl upgrade --image "$TARGET_IMAGE" -n "$cp_ip"

    # Wait for the node to come back
    echo "Waiting for $cp_name to become Ready..."
    talosctl health -n "$cp_ip" --wait-timeout 10m

    # Verify etcd health
    talosctl etcd status -n "$cp_ip"

    # Uncordon the node
    kubectl uncordon "$cp_name"

    # Verify all kube-system pods are healthy
    kubectl get pods -n kube-system

    # Wait and verify stability
    echo "Waiting 60 seconds to verify stability..."
    sleep 60

    # Final health check
    kubectl get nodes
    echo "Control plane node $cp_name upgraded successfully"
    echo "---"
done
```

### Phase 2: Kubernetes Version Upgrade

If the Talos upgrade includes a new Kubernetes version, apply it:

```bash
# Upgrade the Kubernetes version
talosctl upgrade-k8s \
    --from 1.31.0 \
    --to 1.32.0 \
    -n <control-plane-ip>
```

This command handles the API server, controller manager, scheduler, and kube-proxy upgrades in the correct order.

### Phase 3: Worker Node Upgrades

Worker nodes can be upgraded in parallel batches. The key is to never drain more nodes than your cluster can handle:

```bash
#!/bin/bash
# upgrade-workers.sh

TARGET_IMAGE="ghcr.io/siderolabs/installer:v1.9.1"
MAX_UNAVAILABLE=3  # Maximum nodes down at once

# Get all worker node IPs
WORKER_IPS=$(kubectl get nodes \
    -l '!node-role.kubernetes.io/control-plane' \
    -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

upgrade_worker() {
    local ip=$1
    local name
    name=$(kubectl get nodes -o wide --no-headers | grep "$ip" | awk '{print $1}')

    echo "Upgrading worker: $name ($ip)"

    kubectl drain "$name" \
        --ignore-daemonsets \
        --delete-emptydir-data \
        --timeout=300s

    talosctl upgrade --image "$TARGET_IMAGE" -n "$ip"

    sleep 30
    kubectl wait --for=condition=Ready "node/$name" --timeout=600s
    kubectl uncordon "$name"

    echo "Worker $name upgraded"
}

# Process in batches
BATCH=()
for ip in $WORKER_IPS; do
    BATCH+=("$ip")

    if [ "${#BATCH[@]}" -ge "$MAX_UNAVAILABLE" ]; then
        # Run batch in parallel
        for batch_ip in "${BATCH[@]}"; do
            upgrade_worker "$batch_ip" &
        done
        wait  # Wait for the batch
        BATCH=()
        sleep 30  # Stabilization period
    fi
done

# Handle remaining nodes
for batch_ip in "${BATCH[@]}"; do
    upgrade_worker "$batch_ip" &
done
wait
```

## Handling Graceful Shutdown

For zero downtime, your applications must handle graceful shutdown properly. When a pod is evicted during node drain, Kubernetes sends a SIGTERM signal. Your application needs to:

1. Stop accepting new connections
2. Finish processing in-flight requests
3. Close cleanly

Configure appropriate termination grace periods:

```yaml
spec:
  terminationGracePeriodSeconds: 60
  containers:
  - name: app
    lifecycle:
      preStop:
        exec:
          command:
          - /bin/sh
          - -c
          - "sleep 5"  # Give load balancers time to update
```

## Monitoring During Upgrades

Keep real-time monitoring running throughout the upgrade process:

```bash
# In a separate terminal, watch node status
kubectl get nodes -w

# Watch for pod disruptions
kubectl get events --sort-by='.lastTimestamp' -w

# Monitor application endpoints
while true; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://my-app.example.com/health)
    echo "$(date): Health check status: $STATUS"
    sleep 5
done
```

## Handling Upgrade Failures

If something goes wrong during the upgrade, you need to respond quickly:

```bash
# Roll back a Talos upgrade on a specific node
talosctl rollback -n <node-ip>

# If Kubernetes upgrade fails, the previous version is still on disk
# Talos will use the previous version after rollback
```

If a node gets stuck during upgrade:

```bash
# Check node status
talosctl health -n <node-ip>

# Check for error messages
talosctl dmesg -n <node-ip>

# If the node is completely unresponsive, wait longer
# Talos upgrades can take several minutes on slow hardware
```

## Post-Upgrade Verification

After all nodes are upgraded, run a comprehensive verification:

```bash
#!/bin/bash
# post-upgrade-verify.sh

echo "=== Post-Upgrade Verification ==="

# Check all nodes are on the target version
echo "Node versions:"
for node in $(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'); do
    echo -n "  $node: "
    talosctl version -n "$node" --short 2>/dev/null | grep Tag
done

# Check Kubernetes version
echo ""
echo "Kubernetes version:"
kubectl version --short 2>/dev/null

# Check all pods
echo ""
echo "Pod status:"
kubectl get pods -A --no-headers | awk '{print $4}' | sort | uniq -c | sort -rn

# Check for any issues
ISSUES=$(kubectl get pods -A --no-headers | grep -v "Running\|Completed" | wc -l)
if [ "$ISSUES" -gt 0 ]; then
    echo ""
    echo "WARNING: $ISSUES pods in non-healthy state:"
    kubectl get pods -A --no-headers | grep -v "Running\|Completed"
fi

echo ""
echo "=== Verification Complete ==="
```

## Conclusion

Zero-downtime upgrades on Talos Linux are achievable when you combine proper application redundancy, Pod Disruption Budgets, and a disciplined upgrade sequence. The immutable nature of Talos makes each node upgrade predictable and reversible. The key is preparation: make sure your applications are redundant, your PDBs are in place, and your monitoring is active before you start. Then follow the sequence - control plane first, one at a time, then workers in batches. With practice, cluster upgrades become routine events that your users never even notice.
