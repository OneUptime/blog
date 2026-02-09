# How to Upgrade EKS Clusters with Managed Node Group Rolling Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes

Description: Learn how to safely upgrade Amazon EKS clusters using managed node group rolling updates with automated instance replacement, graceful pod eviction, and zero-downtime upgrade strategies.

---

Amazon EKS managed node groups simplify Kubernetes cluster upgrades by automating the node replacement process. Instead of manually upgrading worker nodes, EKS handles instance provisioning, pod drainage, and node termination automatically, making cluster upgrades significantly less complex and error-prone.

## Understanding EKS Managed Node Groups

Managed node groups are collections of EC2 instances that EKS provisions and manages for you. When you upgrade a managed node group, EKS follows a rolling update strategy where it launches new nodes with the target version, waits for them to become ready, drains pods from old nodes, and terminates old instances.

This automation removes much of the manual work and risk from node upgrades. However, you still need to understand how the process works, configure proper PodDisruptionBudgets, handle stateful workloads correctly, and monitor the upgrade process to catch issues early.

## Preparing for EKS Cluster Upgrade

Before upgrading your EKS cluster, verify your current versions and check compatibility requirements.

```bash
#!/bin/bash
# check-eks-versions.sh

CLUSTER_NAME="production"

echo "Checking current EKS cluster versions..."

# Get control plane version
CONTROL_PLANE_VERSION=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --query 'cluster.version' \
  --output text)

echo "Control plane version: $CONTROL_PLANE_VERSION"

# Get all node group versions
echo "Node group versions:"
aws eks list-nodegroups \
  --cluster-name $CLUSTER_NAME \
  --query 'nodegroups' \
  --output text | while read nodegroup; do

  version=$(aws eks describe-nodegroup \
    --cluster-name $CLUSTER_NAME \
    --nodegroup-name $nodegroup \
    --query 'nodegroup.version' \
    --output text)

  echo "  $nodegroup: $version"
done

# Check addon versions
echo "Addon versions:"
aws eks list-addons \
  --cluster-name $CLUSTER_NAME \
  --query 'addons' \
  --output text | while read addon; do

  version=$(aws eks describe-addon \
    --cluster-name $CLUSTER_NAME \
    --addon-name $addon \
    --query 'addon.addonVersion' \
    --output text)

  echo "  $addon: $version"
done
```

## Upgrading the EKS Control Plane

Always upgrade the control plane before upgrading node groups. EKS supports upgrades to the next minor version only.

```bash
#!/bin/bash
# upgrade-eks-control-plane.sh

CLUSTER_NAME="production"
TARGET_VERSION="1.29"

echo "Starting EKS control plane upgrade to version $TARGET_VERSION..."

# Check current version
CURRENT_VERSION=$(aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --query 'cluster.version' \
  --output text)

echo "Current version: $CURRENT_VERSION"
echo "Target version: $TARGET_VERSION"

# Validate upgrade path (must be sequential)
if ! aws eks describe-addon-versions \
  --kubernetes-version $TARGET_VERSION > /dev/null 2>&1; then
  echo "ERROR: Invalid target version"
  exit 1
fi

# Start control plane upgrade
echo "Initiating control plane upgrade..."
aws eks update-cluster-version \
  --name $CLUSTER_NAME \
  --kubernetes-version $TARGET_VERSION

# Monitor upgrade progress
echo "Monitoring upgrade progress..."
while true; do
  status=$(aws eks describe-cluster \
    --name $CLUSTER_NAME \
    --query 'cluster.status' \
    --output text)

  version=$(aws eks describe-cluster \
    --name $CLUSTER_NAME \
    --query 'cluster.version' \
    --output text)

  echo "$(date): Status=$status, Version=$version"

  if [ "$status" == "ACTIVE" ] && [ "$version" == "$TARGET_VERSION" ]; then
    echo "Control plane upgrade complete!"
    break
  fi

  if [ "$status" == "FAILED" ]; then
    echo "ERROR: Control plane upgrade failed"
    exit 1
  fi

  sleep 30
done
```

## Configuring Node Group Update Strategy

Configure how EKS performs rolling updates for your node groups. You can control the update behavior to balance speed and stability.

```bash
# Get current update config
aws eks describe-nodegroup \
  --cluster-name production \
  --nodegroup-name standard-workers \
  --query 'nodegroup.updateConfig'

# Update the node group update config
aws eks update-nodegroup-config \
  --cluster-name production \
  --nodegroup-name standard-workers \
  --update-config maxUnavailable=1,maxUnavailablePercentage=33

# Alternative: configure via CloudFormation
cat > nodegroup-update-config.yaml << 'EOF'
Resources:
  NodeGroup:
    Type: AWS::EKS::Nodegroup
    Properties:
      ClusterName: production
      NodegroupName: standard-workers
      UpdateConfig:
        MaxUnavailable: 1
        MaxUnavailablePercentage: 33
      ScalingConfig:
        MinSize: 3
        MaxSize: 10
        DesiredSize: 5
      ReleaseVersion: "1.29.0-20240129"
EOF
```

The maxUnavailable setting determines how many nodes can be unavailable during the upgrade. Setting it to 1 is the safest option, upgrading one node at a time. Using maxUnavailablePercentage allows scaling based on cluster size.

## Setting Up PodDisruptionBudgets

Before upgrading nodes, ensure your applications have proper PodDisruptionBudgets to prevent service disruption.

```yaml
# Critical application PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: critical-app
      tier: backend
---
# Web frontend PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: frontend-pdb
  namespace: production
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: frontend
---
# Database PDB (more conservative)
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
  namespace: production
spec:
  minAvailable: 100%
  selector:
    matchLabels:
      app: postgres
      role: master
```

Verify PDBs before starting the upgrade:

```bash
#!/bin/bash
# verify-pdbs.sh

echo "Checking PodDisruptionBudgets..."

kubectl get pdb -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
MIN_AVAILABLE:.spec.minAvailable,\
MAX_UNAVAILABLE:.spec.maxUnavailable,\
ALLOWED_DISRUPTIONS:.status.disruptionsAllowed

# Check for pods without PDBs
echo "Deployments without PodDisruptionBudgets:"
kubectl get deploy -A -o json | jq -r '
  .items[] |
  select(.spec.replicas > 1) |
  "\(.metadata.namespace)/\(.metadata.name)"
' | while read deploy; do
  ns=$(echo $deploy | cut -d/ -f1)
  name=$(echo $deploy | cut -d/ -f2)

  labels=$(kubectl get deploy $name -n $ns -o jsonpath='{.spec.selector.matchLabels}')

  # Check if PDB exists for these labels
  if ! kubectl get pdb -n $ns -o json | jq -e --arg labels "$labels" \
    '.items[] | select(.spec.selector.matchLabels == ($labels | fromjson))' > /dev/null; then
    echo "  WARNING: $deploy has no PDB"
  fi
done
```

## Upgrading Managed Node Groups

With PDBs in place, upgrade your node groups. EKS will handle the rolling update automatically.

```bash
#!/bin/bash
# upgrade-node-groups.sh

CLUSTER_NAME="production"
TARGET_VERSION="1.29"

echo "Upgrading EKS node groups to version $TARGET_VERSION..."

# List all node groups
nodegroups=$(aws eks list-nodegroups \
  --cluster-name $CLUSTER_NAME \
  --query 'nodegroups' \
  --output text)

for nodegroup in $nodegroups; do
  echo "Upgrading node group: $nodegroup"

  # Check current version
  current_version=$(aws eks describe-nodegroup \
    --cluster-name $CLUSTER_NAME \
    --nodegroup-name $nodegroup \
    --query 'nodegroup.version' \
    --output text)

  echo "  Current version: $current_version"

  if [ "$current_version" == "$TARGET_VERSION" ]; then
    echo "  Already at target version, skipping"
    continue
  fi

  # Start node group upgrade
  update_id=$(aws eks update-nodegroup-version \
    --cluster-name $CLUSTER_NAME \
    --nodegroup-name $nodegroup \
    --kubernetes-version $TARGET_VERSION \
    --query 'update.id' \
    --output text)

  echo "  Update ID: $update_id"

  # Monitor upgrade progress
  while true; do
    status=$(aws eks describe-update \
      --name $CLUSTER_NAME \
      --update-id $update_id \
      --nodegroup-name $nodegroup \
      --query 'update.status' \
      --output text)

    echo "  $(date): Status=$status"

    case $status in
      "Successful")
        echo "  Node group $nodegroup upgrade complete!"
        break
        ;;
      "Failed"|"Cancelled")
        echo "  ERROR: Node group upgrade $status"
        exit 1
        ;;
      "InProgress")
        # Get detailed progress
        aws eks describe-update \
          --name $CLUSTER_NAME \
          --update-id $update_id \
          --nodegroup-name $nodegroup \
          --query 'update.params' \
          --output table
        ;;
    esac

    sleep 60
  done
done

echo "All node groups upgraded successfully!"
```

## Monitoring Node Group Upgrades

Monitor the upgrade process closely to catch any issues early.

```bash
#!/bin/bash
# monitor-node-upgrade.sh

CLUSTER_NAME="production"
NODEGROUP_NAME="standard-workers"

echo "Monitoring node group upgrade..."

# Watch node status
watch -n 10 'kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.conditions[?(@.type==\"Ready\")].status,\
VERSION:.status.nodeInfo.kubeletVersion,\
PODS:.status.allocatable.pods'

# Monitor pod evictions
kubectl get events --all-namespaces --watch \
  --field-selector reason=Evicted

# Check for pods stuck in terminating
watch -n 5 'kubectl get pods --all-namespaces \
  --field-selector status.phase=Terminating'

# Monitor PDB status during upgrade
watch -n 10 'kubectl get pdb -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
ALLOWED_DISRUPTIONS:.status.disruptionsAllowed'
```

Create an automated monitoring script:

```bash
#!/bin/bash
# automated-upgrade-monitor.sh

CLUSTER_NAME="production"
NODEGROUP_NAME="standard-workers"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

send_alert() {
  local message=$1
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$message\"}" \
    $SLACK_WEBHOOK
}

# Monitor node count
initial_node_count=$(kubectl get nodes -o json | jq '.items | length')

while true; do
  current_node_count=$(kubectl get nodes -o json | jq '.items | length')

  if [ $current_node_count -lt $((initial_node_count - 1)) ]; then
    send_alert "WARNING: Node count dropped to $current_node_count (was $initial_node_count)"
  fi

  # Check for unhealthy nodes
  unhealthy=$(kubectl get nodes -o json | \
    jq -r '.items[] | select(.status.conditions[] |
    select(.type=="Ready" and .status!="True")) |
    .metadata.name')

  if [ ! -z "$unhealthy" ]; then
    send_alert "WARNING: Unhealthy nodes detected: $unhealthy"
  fi

  # Check for PDB violations
  pdb_violations=$(kubectl get pdb -A -o json | \
    jq -r '.items[] | select(.status.disruptionsAllowed == 0) |
    "\(.metadata.namespace)/\(.metadata.name)"')

  if [ ! -z "$pdb_violations" ]; then
    send_alert "INFO: PDBs blocking disruptions: $pdb_violations"
  fi

  sleep 30
done
```

## Handling Upgrade Failures

If a node group upgrade fails, you need to troubleshoot and potentially rollback.

```bash
#!/bin/bash
# troubleshoot-failed-upgrade.sh

CLUSTER_NAME="production"
NODEGROUP_NAME="standard-workers"

echo "Troubleshooting failed node group upgrade..."

# Get update details
aws eks describe-update \
  --name $CLUSTER_NAME \
  --nodegroup-name $NODEGROUP_NAME \
  --update-id $(aws eks list-updates \
    --name $CLUSTER_NAME \
    --nodegroup-name $NODEGROUP_NAME \
    --query 'updateIds[0]' \
    --output text)

# Check node group health
aws eks describe-nodegroup \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $NODEGROUP_NAME \
  --query 'nodegroup.health'

# Check for pods that couldn't be evicted
kubectl get pods -A --field-selector status.phase=Running | \
  grep -E "Pending|Unknown"

# Check node conditions
kubectl describe nodes | grep -A 10 "Conditions:"

# Check for PDB issues
kubectl get pdb -A -o json | \
  jq '.items[] | select(.status.disruptionsAllowed == 0)'
```

## Upgrading Launch Templates

For more control over node configuration, use launch templates with managed node groups.

```bash
#!/bin/bash
# update-launch-template.sh

CLUSTER_NAME="production"
NODEGROUP_NAME="standard-workers"
LAUNCH_TEMPLATE_ID="lt-0123456789abcdef"

# Create new launch template version
NEW_VERSION=$(aws ec2 create-launch-template-version \
  --launch-template-id $LAUNCH_TEMPLATE_ID \
  --source-version '$Latest' \
  --launch-template-data '{
    "ImageId": "ami-0123456789abcdef",
    "UserData": "'"$(base64 -w 0 userdata.sh)"'"
  }' \
  --query 'LaunchTemplateVersion.VersionNumber' \
  --output text)

echo "Created launch template version: $NEW_VERSION"

# Update node group to use new launch template
aws eks update-nodegroup-config \
  --cluster-name $CLUSTER_NAME \
  --nodegroup-name $NODEGROUP_NAME \
  --launch-template "{
    \"id\":\"$LAUNCH_TEMPLATE_ID\",
    \"version\":\"$NEW_VERSION\"
  }"

echo "Node group will roll to new launch template version"
```

## Post-Upgrade Validation

After upgrading, validate that everything works correctly.

```bash
#!/bin/bash
# validate-upgrade.sh

CLUSTER_NAME="production"

echo "Validating EKS cluster upgrade..."

# Verify all nodes are at target version
echo "Node versions:"
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion

# Check all pods are running
unhealthy_pods=$(kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded -o json | jq '.items | length')

if [ $unhealthy_pods -gt 0 ]; then
  echo "WARNING: Found $unhealthy_pods unhealthy pods"
  kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded
else
  echo "All pods healthy"
fi

# Run smoke tests
kubectl run test-pod --image=busybox --rm -it --restart=Never -- \
  nslookup kubernetes.default

# Check addon status
echo "Addon status:"
aws eks list-addons --cluster-name $CLUSTER_NAME | \
  jq -r '.addons[]' | while read addon; do
  status=$(aws eks describe-addon \
    --cluster-name $CLUSTER_NAME \
    --addon-name $addon \
    --query 'addon.health.issues' \
    --output json)
  echo "$addon: $status"
done

echo "Validation complete"
```

EKS managed node groups dramatically simplify Kubernetes cluster upgrades by automating node replacement and pod migration. By properly configuring PodDisruptionBudgets, monitoring the upgrade process, and validating results, you can upgrade EKS clusters with minimal risk and zero downtime.
