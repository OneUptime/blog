# How to Rollback Kubernetes Upgrades When Issues Are Detected

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rollback, Disaster-Recovery

Description: Master Kubernetes upgrade rollback procedures including control plane rollback, node version downgrades, and etcd restoration for recovering from failed upgrades with minimal downtime.

---

Even with perfect planning, Kubernetes upgrades can fail. When they do, you need a clear rollback strategy to restore cluster functionality quickly. Understanding how to safely rollback control plane versions, node versions, and cluster state is essential for production cluster operations.

## When to Rollback

Knowing when to rollback versus push forward is critical. Rollback when you encounter control plane instability, widespread pod failures, API compatibility issues, or data plane networking failures. Consider pushing forward when only a few pods fail, when issues are application-specific rather than platform-wide, or when you're close to completing the upgrade.

Set clear rollback criteria before starting upgrades. Define metrics that trigger automatic rollback and establish decision-making authority for rollback calls.

```bash
#!/bin/bash
# check-upgrade-health.sh

ROLLBACK_THRESHOLD=10

echo "Checking upgrade health..."

# Count unhealthy pods
unhealthy_pods=$(kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded -o json | jq '.items | length')

# Count not-ready nodes
notready_nodes=$(kubectl get nodes -o json | jq '[.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True"))] | length')

# Check API server errors
api_errors=$(kubectl get --raw /metrics | grep apiserver_request_total | grep code=\"5 | wc -l)

echo "Unhealthy pods: $unhealthy_pods"
echo "Not ready nodes: $notready_nodes"
echo "API errors: $api_errors"

if [ $unhealthy_pods -gt $ROLLBACK_THRESHOLD ] || [ $notready_nodes -gt 0 ]; then
  echo "CRITICAL: Health check failed - consider rollback"
  exit 1
else
  echo "Health check passed"
fi
```

## Rolling Back Control Plane

For managed Kubernetes services, control plane rollback is generally not supported. You must restore from etcd backup. For self-managed clusters, you have more options.

```bash
#!/bin/bash
# rollback-control-plane.sh

OLD_VERSION="1.28.5"
FAILED_VERSION="1.29.0"

echo "Rolling back control plane from $FAILED_VERSION to $OLD_VERSION..."

# Stop API server
sudo systemctl stop kube-apiserver

# Stop controller manager
sudo systemctl stop kube-controller-manager

# Stop scheduler
sudo systemctl stop kube-scheduler

# Replace binaries with old versions
sudo cp /usr/local/bin/kube-apiserver.$OLD_VERSION /usr/local/bin/kube-apiserver
sudo cp /usr/local/bin/kube-controller-manager.$OLD_VERSION /usr/local/bin/kube-controller-manager
sudo cp /usr/local/bin/kube-scheduler.$OLD_VERSION /usr/local/bin/kube-scheduler

# Update static pod manifests
sudo sed -i "s/$FAILED_VERSION/$OLD_VERSION/g" /etc/kubernetes/manifests/kube-apiserver.yaml
sudo sed -i "s/$FAILED_VERSION/$OLD_VERSION/g" /etc/kubernetes/manifests/kube-controller-manager.yaml
sudo sed -i "s/$FAILED_VERSION/$OLD_VERSION/g" /etc/kubernetes/manifests/kube-scheduler.yaml

# Start services
sudo systemctl start kube-apiserver
sleep 10
sudo systemctl start kube-controller-manager
sudo systemctl start kube-scheduler

# Verify rollback
kubectl version --short
kubectl get nodes
```

## Restoring from etcd Backup

When control plane rollback isn't enough, restore from etcd backup.

```bash
#!/bin/bash
# restore-etcd-backup.sh

BACKUP_FILE="/var/backups/etcd/etcd-snapshot-pre-upgrade.db"
ETCD_DATA_DIR="/var/lib/etcd"
ETCD_NAME="master-1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Restoring etcd from backup: $BACKUP_FILE"

# Stop etcd
sudo systemctl stop etcd

# Backup current data (just in case)
sudo mv $ETCD_DATA_DIR ${ETCD_DATA_DIR}.backup-$(date +%Y%m%d-%H%M%S)

# Restore from snapshot
export ETCDCTL_API=3
sudo etcdctl snapshot restore $BACKUP_FILE \
  --data-dir=$ETCD_DATA_DIR \
  --name=$ETCD_NAME \
  --initial-cluster=$ETCD_NAME=https://10.0.1.10:2380 \
  --initial-advertise-peer-urls=https://10.0.1.10:2380

# Fix permissions
sudo chown -R etcd:etcd $ETCD_DATA_DIR

# Start etcd
sudo systemctl start etcd

# Wait for etcd to be ready
sleep 10

# Verify etcd health
etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Restart control plane components
sudo systemctl restart kube-apiserver
sudo systemctl restart kube-controller-manager
sudo systemctl restart kube-scheduler

echo "etcd restored successfully"
```

## Rolling Back Node Versions

Roll back worker nodes to the previous Kubernetes version.

```bash
#!/bin/bash
# rollback-node-version.sh

NODE_NAME="$1"
OLD_VERSION="1.28.5"

if [ -z "$NODE_NAME" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

echo "Rolling back node $NODE_NAME to version $OLD_VERSION..."

# Cordon node
kubectl cordon $NODE_NAME

# Drain node
kubectl drain $NODE_NAME \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=300 \
  --timeout=600s

# SSH to node and downgrade components
ssh $NODE_NAME << EOF
  # Stop kubelet
  sudo systemctl stop kubelet

  # Install old kubelet version
  sudo apt-get install -y --allow-downgrades kubelet=$OLD_VERSION-00

  # Install old kubectl
  sudo apt-get install -y --allow-downgrades kubectl=$OLD_VERSION-00

  # Restart kubelet
  sudo systemctl start kubelet

  # Verify version
  kubelet --version
EOF

# Wait for node to be ready
echo "Waiting for node to be ready..."
sleep 30

# Uncordon node
kubectl uncordon $NODE_NAME

# Verify node status
kubectl get node $NODE_NAME -o wide
```

For managed node groups (EKS, GKE, AKS), rolling back typically means replacing node groups:

```bash
#!/bin/bash
# rollback-eks-nodegroup.sh

CLUSTER_NAME="production"
NEW_NODEGROUP="workers-v128"
OLD_VERSION="1.28"

echo "Creating rollback node group with version $OLD_VERSION..."

# Create new node group with old version
aws eks create-nodegroup \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $NEW_NODEGROUP \
  --node-role arn:aws:iam::123456789012:role/eks-node-role \
  --subnets subnet-abc123 subnet-def456 \
  --instance-types t3.large \
  --scaling-config minSize=3,maxSize=10,desiredSize=5 \
  --kubernetes-version $OLD_VERSION

# Wait for new node group
echo "Waiting for new node group..."
aws eks wait nodegroup-active \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $NEW_NODEGROUP

# Cordon and drain old nodes
kubectl get nodes -l eks.amazonaws.com/nodegroup=workers-v129 -o name | \
  xargs -I {} kubectl cordon {}

kubectl get nodes -l eks.amazonaws.com/nodegroup=workers-v129 -o name | \
  xargs -I {} kubectl drain {} --ignore-daemonsets --delete-emptydir-data

# Delete failed node group
aws eks delete-nodegroup \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name workers-v129

echo "Rollback complete"
```

## Rolling Back Addons

Roll back cluster addons that were upgraded.

```bash
#!/bin/bash
# rollback-addons.sh

echo "Rolling back cluster addons..."

# Rollback CoreDNS
kubectl set image deployment/coredns -n kube-system \
  coredns=registry.k8s.io/coredns/coredns:v1.10.1

kubectl rollout status deployment/coredns -n kube-system

# Rollback kube-proxy
kubectl set image daemonset/kube-proxy -n kube-system \
  kube-proxy=registry.k8s.io/kube-proxy:v1.28.5

kubectl rollout status daemonset/kube-proxy -n kube-system

# Rollback CNI (Calico example)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.0/manifests/calico.yaml

# Rollback metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.4/components.yaml

echo "Addon rollback complete"
```

For EKS addons:

```bash
#!/bin/bash
# rollback-eks-addons.sh

CLUSTER_NAME="production"

# Rollback VPC CNI
aws eks update-addon \
  --cluster-name $CLUSTER_NAME \
  --addon-name vpc-cni \
  --addon-version v1.15.0-eksbuild.1 \
  --resolve-conflicts OVERWRITE

# Rollback CoreDNS
aws eks update-addon \
  --cluster-name $CLUSTER_NAME \
  --addon-name coredns \
  --addon-version v1.10.1-eksbuild.2 \
  --resolve-conflicts OVERWRITE

# Rollback kube-proxy
aws eks update-addon \
  --cluster-name $CLUSTER_NAME \
  --addon-name kube-proxy \
  --addon-version v1.28.5-eksbuild.1 \
  --resolve-conflicts OVERWRITE
```

## Automated Rollback Triggers

Implement automated rollback based on health metrics.

```bash
#!/bin/bash
# automated-rollback-monitor.sh

CLUSTER_NAME="production"
ROLLBACK_SCRIPT="/usr/local/bin/rollback-cluster.sh"
CHECK_INTERVAL=60
FAILURE_THRESHOLD=3

failure_count=0

while true; do
  # Check cluster health
  unhealthy=$(kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded -o json | jq '.items | length')

  notready=$(kubectl get nodes -o json | jq '[.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True"))] | length')

  # Check API server health
  if ! kubectl get --raw /healthz > /dev/null 2>&1; then
    echo "$(date): API server unhealthy"
    ((failure_count++))
  elif [ $unhealthy -gt 10 ] || [ $notready -gt 0 ]; then
    echo "$(date): Cluster health degraded - unhealthy pods: $unhealthy, not ready nodes: $notready"
    ((failure_count++))
  else
    # Reset counter on healthy check
    failure_count=0
  fi

  # Trigger rollback if threshold exceeded
  if [ $failure_count -ge $FAILURE_THRESHOLD ]; then
    echo "$(date): CRITICAL - Initiating automatic rollback"

    # Send alert
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"ALERT: Automatic rollback triggered for cluster '$CLUSTER_NAME'"}' \
      $SLACK_WEBHOOK

    # Execute rollback
    $ROLLBACK_SCRIPT

    exit 1
  fi

  sleep $CHECK_INTERVAL
done
```

## Handling Application Rollbacks

Roll back application deployments affected by the upgrade.

```bash
#!/bin/bash
# rollback-applications.sh

echo "Rolling back applications..."

# Get all deployments
kubectl get deployments -A -o json | jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
while read ns name; do
  # Check if deployment has issues
  ready=$(kubectl get deployment $name -n $ns -o jsonpath='{.status.readyReplicas}')
  desired=$(kubectl get deployment $name -n $ns -o jsonpath='{.spec.replicas}')

  if [ "$ready" != "$desired" ]; then
    echo "Rolling back $ns/$name (ready: $ready, desired: $desired)"

    # Rollback to previous revision
    kubectl rollout undo deployment/$name -n $ns

    # Wait for rollout
    kubectl rollout status deployment/$name -n $ns --timeout=300s
  fi
done

echo "Application rollbacks complete"
```

## Post-Rollback Validation

After rolling back, validate that the cluster is healthy.

```bash
#!/bin/bash
# validate-rollback.sh

echo "Validating cluster after rollback..."

# Check control plane version
echo "Control plane version:"
kubectl version --short

# Check node versions
echo "Node versions:"
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion

# Check component health
echo "Component health:"
kubectl get componentstatuses

# Check all pods
unhealthy=$(kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded -o json | jq '.items | length')

if [ $unhealthy -eq 0 ]; then
  echo "All pods healthy"
else
  echo "WARNING: $unhealthy unhealthy pods"
  kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded
fi

# Run smoke tests
echo "Running smoke tests..."
kubectl run test-rollback --image=busybox --rm -it --restart=Never -- \
  nslookup kubernetes.default

# Check cluster resources
echo "Cluster resource usage:"
kubectl top nodes

echo "Rollback validation complete"
```

## Documenting Rollback Incidents

Create detailed documentation of rollback events.

```bash
#!/bin/bash
# document-rollback.sh

INCIDENT_FILE="rollback-incident-$(date +%Y%m%d-%H%M%S).md"

cat > $INCIDENT_FILE << EOF
# Kubernetes Upgrade Rollback Incident

## Incident Details
- Date: $(date)
- Cluster: production
- Attempted Upgrade: 1.28.5 -> 1.29.0
- Rollback Performed: Yes
- Duration: [To be filled]

## Timeline
- [Time]: Upgrade initiated
- [Time]: Issues detected
- [Time]: Rollback decision made
- [Time]: Rollback completed
- [Time]: Cluster validated healthy

## Issues Encountered
[Describe what went wrong]

## Rollback Actions Taken
1. Control plane rolled back
2. Worker nodes rolled back
3. Addons rolled back
4. etcd restored from backup

## Root Cause
[To be determined]

## Lessons Learned
[What we learned from this incident]

## Action Items
- [ ] Investigate root cause
- [ ] Update rollback procedures
- [ ] Improve pre-upgrade testing
- [ ] Schedule retry with fixes

## Sign-Off
Incident Commander: [Name]
Date: $(date)
EOF

echo "Incident documentation created: $INCIDENT_FILE"
```

Rolling back Kubernetes upgrades is a critical skill that every cluster operator must have. By maintaining current backups, implementing automated health checks, having clear rollback procedures, and practicing rollback scenarios regularly, you can recover quickly from failed upgrades and minimize production impact.
