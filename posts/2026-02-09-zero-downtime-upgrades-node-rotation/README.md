# How to Implement Zero-Downtime Kubernetes Version Upgrades with Node Pool Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, High Availability, Node Pool, Version Upgrades

Description: Learn how to upgrade Kubernetes clusters without downtime using node pool rotation strategies, ensuring continuous service availability while maintaining security and performance standards.

---

Upgrading Kubernetes clusters is a critical operational task that teams often approach with trepidation. The challenge is not just about updating software but ensuring your applications remain available throughout the entire process. Node pool rotation is the most reliable method for achieving truly zero-downtime Kubernetes version upgrades.

Unlike in-place upgrades that can introduce unexpected issues, node pool rotation creates a clean separation between old and new infrastructure. This approach gives you complete control over the migration process and provides an easy rollback path if issues emerge.

## Understanding Node Pool Rotation Strategy

Node pool rotation works by creating entirely new nodes running the target Kubernetes version while gradually migrating workloads from old nodes. This method eliminates many risks associated with in-place upgrades because each new node starts fresh with the correct configuration.

The basic flow involves creating a new node pool, cordoning and draining old nodes one by one, and finally removing the old pool once all workloads have migrated successfully. This process respects Pod Disruption Budgets and graceful termination periods, ensuring application availability throughout.

This strategy also allows you to test the new version on a small subset of nodes before committing fully. You can run both versions side by side temporarily, monitoring for issues before completing the migration.

## Preparing Your Cluster for Node Pool Rotation

Before starting the upgrade process, you need to ensure your cluster and applications are properly configured for zero-downtime operations. Start by verifying that all critical deployments have appropriate Pod Disruption Budgets defined.

```yaml
# Example PDB for critical services
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-server
```

This Pod Disruption Budget ensures that at least two replicas of your API server remain available during any disruption, including node drains. Without proper PDBs, draining nodes can cause service interruptions.

Next, verify that your applications handle graceful shutdown correctly. Configure preStop hooks and appropriate termination grace periods to allow connections to complete cleanly.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
spec:
  replicas: 3
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: app
        image: myapp:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
        ports:
        - containerPort: 8080
```

The preStop hook gives the load balancer time to remove the pod from rotation before the application begins shutdown. The termination grace period allows ongoing requests to complete naturally.

## Creating the New Node Pool

The first step in node pool rotation is creating a new node pool with the target Kubernetes version. The exact method depends on your cloud provider or infrastructure setup.

For Google Kubernetes Engine (GKE), create a new node pool using the gcloud CLI:

```bash
# Create new node pool with updated Kubernetes version
gcloud container node-pools create new-pool \
  --cluster=production-cluster \
  --machine-type=n1-standard-4 \
  --num-nodes=3 \
  --node-version=1.28.5-gke.1000 \
  --enable-autorepair \
  --enable-autoupgrade \
  --disk-size=100 \
  --disk-type=pd-standard \
  --zone=us-central1-a
```

For Amazon EKS, create a new node group using eksctl:

```bash
# Create new managed node group with updated version
eksctl create nodegroup \
  --cluster=production-cluster \
  --name=new-node-group \
  --node-type=t3.medium \
  --nodes=3 \
  --nodes-min=3 \
  --nodes-max=6 \
  --version=1.28 \
  --managed
```

For Azure AKS, create a new node pool using the Azure CLI:

```bash
# Create new node pool with specific Kubernetes version
az aks nodepool add \
  --resource-group production-rg \
  --cluster-name production-cluster \
  --name newpool \
  --node-count 3 \
  --kubernetes-version 1.28.5 \
  --mode System
```

After creating the new node pool, verify that nodes are healthy and ready before proceeding with workload migration.

```bash
# Check that new nodes are ready
kubectl get nodes -l cloud.google.com/gke-nodepool=new-pool

# Verify node version
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion
```

## Migrating Workloads with Controlled Draining

Once your new node pool is operational, begin migrating workloads systematically. Rather than draining all old nodes simultaneously, migrate one node at a time to maintain cluster stability.

Start by cordoning a node to prevent new pods from being scheduled there:

```bash
# Cordon node to prevent new pod scheduling
kubectl cordon old-node-1

# Verify cordon status
kubectl get node old-node-1 -o jsonpath='{.spec.unschedulable}'
```

Cordoning marks the node as unschedulable but does not affect existing pods. This step ensures that as pods are evicted and rescheduled, they land on new nodes rather than other old nodes.

Next, drain the node with appropriate flags to respect Pod Disruption Budgets and graceful termination:

```bash
# Drain node safely with PDB respect
kubectl drain old-node-1 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=60 \
  --timeout=600s
```

The drain command evicts pods from the node, respecting termination grace periods and Pod Disruption Budgets. The timeout ensures the operation does not hang indefinitely if issues occur.

Monitor the migration progress carefully:

```bash
# Watch pod rescheduling
kubectl get pods --all-namespaces -o wide --watch

# Check for any pending pods
kubectl get pods --all-namespaces --field-selector status.phase=Pending
```

If pods remain pending, investigate scheduling constraints, resource availability, or node affinity rules that might prevent successful rescheduling.

## Handling Stateful Workloads During Migration

Stateful applications require extra care during node pool rotation. StatefulSets with local persistent volumes need special handling to migrate successfully.

For StatefulSets using dynamic provisioning with storage classes that support volume migration, the process is relatively straightforward. The pods are terminated on the old node and recreated on new nodes, with volumes following along.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 3
  serviceName: database
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - database
            topologyKey: kubernetes.io/hostname
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

For databases and stateful services, consider reducing the replica count temporarily, migrating nodes, and then scaling back up. This approach minimizes the number of simultaneous data movements.

If using local persistent volumes tied to specific nodes, you need to migrate data before draining nodes. Use tools like rsync or application-specific backup and restore procedures to move data to new nodes before evicting pods.

## Automating Node Pool Rotation

Manual node pool rotation works well for occasional upgrades, but automation reduces human error and makes regular updates sustainable. Create scripts or use tools like Terraform to codify your rotation process.

Here is a basic automation script that handles the rotation systematically:

```bash
#!/bin/bash
# automated-node-rotation.sh - Safely rotate Kubernetes nodes

set -e

OLD_POOL="old-pool"
NEW_POOL="new-pool"
DRAIN_TIMEOUT="600s"

# Get all nodes in the old pool
OLD_NODES=$(kubectl get nodes -l cloud.google.com/gke-nodepool=$OLD_POOL -o name)

for NODE in $OLD_NODES; do
  echo "Processing $NODE..."

  # Cordon the node
  kubectl cordon $NODE

  # Wait a bit for load balancers to update
  sleep 30

  # Drain the node
  kubectl drain $NODE \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --grace-period=60 \
    --timeout=$DRAIN_TIMEOUT

  # Verify all pods have migrated
  POD_COUNT=$(kubectl get pods --all-namespaces --field-selector spec.nodeName=$(basename $NODE) --no-headers | wc -l)

  if [ $POD_COUNT -eq 0 ]; then
    echo "$NODE successfully drained"
  else
    echo "Warning: $NODE still has $POD_COUNT pods"
    exit 1
  fi

  # Wait between nodes to allow cluster to stabilize
  echo "Waiting for cluster to stabilize..."
  sleep 120
done

echo "All nodes rotated successfully"
```

This script processes nodes one at a time with appropriate delays between each operation. The stabilization period allows the cluster to rebalance and ensures application health before proceeding.

Consider integrating health checks between node drains to automatically verify application availability:

```bash
# Check application health before continuing
check_app_health() {
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health)
  if [ $RESPONSE -eq 200 ]; then
    return 0
  else
    echo "Health check failed with status $RESPONSE"
    return 1
  fi
}

# Add to rotation script after each drain
if check_app_health; then
  echo "Application healthy, continuing rotation"
else
  echo "Application unhealthy, pausing rotation"
  exit 1
fi
```

## Monitoring and Validation

Throughout the node pool rotation process, monitor cluster health and application metrics closely. Track pod scheduling latency, error rates, and resource utilization to detect issues early.

Use Prometheus queries to monitor pod lifecycle events during rotation:

```promql
# Track pod creation rate during rotation
rate(kube_pod_created[5m])

# Monitor pod scheduling latency
histogram_quantile(0.99, rate(scheduler_scheduling_duration_seconds_bucket[5m]))

# Track failed pod scheduling attempts
rate(kube_pod_failed[5m])
```

After completing the rotation, validate that all applications are running on the new node pool and functioning correctly. Verify that no pods remain on old nodes and that cluster resources are properly balanced.

```bash
# Verify all pods are on new nodes
kubectl get pods --all-namespaces -o wide | grep old-pool

# Check resource utilization across new nodes
kubectl top nodes -l cloud.google.com/gke-nodepool=new-pool

# Validate critical applications
kubectl get deployments --all-namespaces
```

Once validation is complete and you have confirmed successful migration, delete the old node pool to complete the upgrade process.

Node pool rotation provides the safest path for zero-downtime Kubernetes upgrades. By creating new infrastructure and migrating workloads systematically, you maintain application availability while modernizing your cluster. This approach may take longer than in-place upgrades, but the reduced risk and clean migration path make it the preferred method for production environments.
