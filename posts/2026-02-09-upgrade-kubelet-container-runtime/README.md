# How to Upgrade kubelet and Container Runtime on Worker Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubelet, Container-Runtime

Description: Learn how to safely upgrade kubelet and container runtimes like containerd and CRI-O on Kubernetes worker nodes with graceful pod migration and minimal service disruption.

---

Upgrading kubelet and container runtimes on worker nodes is a critical maintenance task that requires careful coordination. While the process involves replacing core components, proper planning and execution can achieve zero downtime for your applications.

## Understanding kubelet and Runtime Dependencies

The kubelet is the primary agent running on each worker node, responsible for managing pods and containers. It communicates with the container runtime through the Container Runtime Interface (CRI). When upgrading Kubernetes, both kubelet and the runtime may need updates to support new features and maintain compatibility.

Common container runtimes include containerd (most popular), CRI-O (Red Hat ecosystem), and Docker Engine with dockershim (deprecated). Most modern clusters use containerd as it's lightweight, well-maintained, and officially recommended by Kubernetes.

## Checking Current Versions

Before upgrading, identify what versions are currently running on your nodes.

```bash
#!/bin/bash
# check-node-versions.sh

echo "Checking kubelet and runtime versions across cluster..."

# Check kubelet versions
echo "Kubelet versions:"
kubectl get nodes -o custom-columns=\
NODE:.metadata.name,\
KUBELET:.status.nodeInfo.kubeletVersion,\
OS:.status.nodeInfo.osImage

# Check container runtime versions
echo "Container runtime versions:"
kubectl get nodes -o custom-columns=\
NODE:.metadata.name,\
RUNTIME:.status.nodeInfo.containerRuntimeVersion

# Get detailed runtime info from specific node
NODE_NAME=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
echo "Detailed runtime info from $NODE_NAME:"
kubectl get node $NODE_NAME -o jsonpath='{.status.nodeInfo.containerRuntimeVersion}'
```

Check versions directly on the node:

```bash
# SSH into node and check versions
kubelet --version
containerd --version
ctr version
runc --version
```

## Preparing for Upgrades

Before upgrading any nodes, ensure your cluster can handle the temporary capacity reduction.

```bash
#!/bin/bash
# pre-upgrade-checks.sh

echo "Running pre-upgrade checks..."

# Check cluster capacity
echo "Current cluster capacity:"
kubectl top nodes

# Check pod distribution
echo "Pods per node:"
kubectl get pods -A -o json | jq -r '.items[] | .spec.nodeName' | sort | uniq -c | sort -rn

# Verify PodDisruptionBudgets exist
echo "PodDisruptionBudgets:"
kubectl get pdb -A

# Check for critical workloads without replicas
echo "Deployments with single replica:"
kubectl get deploy -A -o json | jq -r '.items[] | select(.spec.replicas == 1) | "\(.metadata.namespace)/\(.metadata.name)"'

# Check node conditions
echo "Node conditions:"
kubectl get nodes -o json | jq -r '.items[] | "\(.metadata.name): \(.status.conditions[] | select(.type=="Ready") | .status)"'
```

## Upgrading kubelet

Upgrade kubelet on worker nodes one at a time to maintain cluster capacity.

```bash
#!/bin/bash
# upgrade-kubelet.sh

NODE_NAME="$1"
TARGET_VERSION="1.29.0"

if [ -z "$NODE_NAME" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

echo "Upgrading kubelet on $NODE_NAME to version $TARGET_VERSION..."

# Cordon the node
echo "Cordoning node..."
kubectl cordon $NODE_NAME

# Drain the node
echo "Draining node..."
kubectl drain $NODE_NAME \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=300 \
  --timeout=600s

# SSH to node and perform upgrade
ssh $NODE_NAME << EOF
  set -e

  # Stop kubelet
  sudo systemctl stop kubelet

  # Upgrade kubelet (Ubuntu/Debian)
  sudo apt-mark unhold kubelet kubectl
  sudo apt-get update
  sudo apt-get install -y kubelet=$TARGET_VERSION-00 kubectl=$TARGET_VERSION-00
  sudo apt-mark hold kubelet kubectl

  # Alternative for RHEL/CentOS
  # sudo yum install -y kubelet-$TARGET_VERSION kubectl-$TARGET_VERSION

  # Restart kubelet
  sudo systemctl daemon-reload
  sudo systemctl start kubelet
  sudo systemctl status kubelet

  # Verify version
  kubelet --version
EOF

# Wait for node to be ready
echo "Waiting for node to be ready..."
sleep 30

# Check node status
kubectl get node $NODE_NAME

# Uncordon the node
echo "Uncordoning node..."
kubectl uncordon $NODE_NAME

# Verify pods are scheduling
echo "Waiting for pods to reschedule..."
sleep 10
kubectl get pods -A -o wide | grep $NODE_NAME

echo "kubelet upgrade complete on $NODE_NAME"
```

## Upgrading containerd

Upgrade the containerd runtime to support new Kubernetes features and security patches.

```bash
#!/bin/bash
# upgrade-containerd.sh

NODE_NAME="$1"
TARGET_VERSION="1.7.11"

if [ -z "$NODE_NAME" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

echo "Upgrading containerd on $NODE_NAME to version $TARGET_VERSION..."

# Cordon and drain node
kubectl cordon $NODE_NAME
kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data

# SSH to node and upgrade containerd
ssh $NODE_NAME << EOF
  set -e

  echo "Stopping containerd..."
  sudo systemctl stop containerd

  # Backup current config
  sudo cp /etc/containerd/config.toml /etc/containerd/config.toml.backup

  # Download new containerd release
  cd /tmp
  wget https://github.com/containerd/containerd/releases/download/v$TARGET_VERSION/containerd-$TARGET_VERSION-linux-amd64.tar.gz

  # Extract and install
  sudo tar Cxzvf /usr/local containerd-$TARGET_VERSION-linux-amd64.tar.gz

  # Verify installation
  containerd --version

  # Start containerd
  sudo systemctl start containerd
  sudo systemctl status containerd

  # Verify containerd is working
  sudo ctr version

  # Restart kubelet to reconnect to new runtime
  sudo systemctl restart kubelet

  # Clean up
  rm containerd-$TARGET_VERSION-linux-amd64.tar.gz
EOF

# Wait for node to be ready
sleep 45
kubectl get node $NODE_NAME

# Uncordon node
kubectl uncordon $NODE_NAME

echo "containerd upgrade complete on $NODE_NAME"
```

## Upgrading CRI-O

For clusters using CRI-O, upgrade the runtime to match your Kubernetes version.

```bash
#!/bin/bash
# upgrade-crio.sh

NODE_NAME="$1"
CRIO_VERSION="1.29"

if [ -z "$NODE_NAME" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

echo "Upgrading CRI-O on $NODE_NAME to version $CRIO_VERSION..."

kubectl cordon $NODE_NAME
kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data

ssh $NODE_NAME << EOF
  set -e

  echo "Stopping CRI-O..."
  sudo systemctl stop crio

  # Add CRI-O repository for target version
  export OS=xUbuntu_22.04
  export VERSION=$CRIO_VERSION

  sudo rm -f /etc/apt/sources.list.d/devel:kubic:libcontainers:stable.list
  sudo rm -f /etc/apt/sources.list.d/devel:kubic:libcontainers:stable:cri-o:$VERSION.list

  echo "deb https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/$OS/ /" | \
    sudo tee /etc/apt/sources.list.d/devel:kubic:libcontainers:stable.list

  echo "deb https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable:/cri-o:/$VERSION/$OS/ /" | \
    sudo tee /etc/apt/sources.list.d/devel:kubic:libcontainers:stable:cri-o:$VERSION.list

  # Update and install
  curl -L https://download.opensuse.org/repositories/devel:kubic:libcontainers:stable:cri-o:/$VERSION/$OS/Release.key | \
    sudo apt-key add -

  curl -L https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/$OS/Release.key | \
    sudo apt-key add -

  sudo apt-get update
  sudo apt-get install -y cri-o cri-o-runc

  # Start CRI-O
  sudo systemctl start crio
  sudo systemctl status crio

  # Verify version
  sudo crictl version

  # Restart kubelet
  sudo systemctl restart kubelet
EOF

sleep 30
kubectl get node $NODE_NAME
kubectl uncordon $NODE_NAME

echo "CRI-O upgrade complete on $NODE_NAME"
```

## Bulk Node Upgrade Script

Automate upgrading all worker nodes with proper sequencing and validation.

```bash
#!/bin/bash
# bulk-upgrade-nodes.sh

TARGET_KUBELET_VERSION="1.29.0"
TARGET_CONTAINERD_VERSION="1.7.11"
PAUSE_BETWEEN_NODES=120

echo "Starting bulk node upgrade..."

# Get list of worker nodes (excluding control plane)
WORKER_NODES=$(kubectl get nodes -l node-role.kubernetes.io/control-plane!= -o jsonpath='{.items[*].metadata.name}')

for node in $WORKER_NODES; do
  echo "========================================  echo "Upgrading node: $node"
  echo "========================================"

  # Cordon node
  kubectl cordon $node

  # Drain node
  kubectl drain $node \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --grace-period=300 \
    --timeout=600s

  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to drain $node"
    kubectl uncordon $node
    continue
  fi

  # Upgrade on node
  ssh $node << 'ENDSSH'
    set -e

    # Upgrade kubelet
    sudo systemctl stop kubelet
    sudo apt-mark unhold kubelet kubectl
    sudo apt-get update
    sudo apt-get install -y kubelet=$TARGET_KUBELET_VERSION-00 kubectl=$TARGET_KUBELET_VERSION-00
    sudo apt-mark hold kubelet kubectl

    # Upgrade containerd
    sudo systemctl stop containerd
    cd /tmp
    wget -q https://github.com/containerd/containerd/releases/download/v$TARGET_CONTAINERD_VERSION/containerd-$TARGET_CONTAINERD_VERSION-linux-amd64.tar.gz
    sudo tar Cxzvf /usr/local containerd-$TARGET_CONTAINERD_VERSION-linux-amd64.tar.gz
    rm containerd-$TARGET_CONTAINERD_VERSION-linux-amd64.tar.gz
    sudo systemctl start containerd

    # Start kubelet
    sudo systemctl daemon-reload
    sudo systemctl start kubelet

    # Verify
    kubelet --version
    containerd --version
ENDSSH

  # Wait for node to be ready
  echo "Waiting for $node to be ready..."
  sleep 45

  # Check node status
  kubectl get node $node

  # Verify node is ready
  ready_status=$(kubectl get node $node -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')

  if [ "$ready_status" != "True" ]; then
    echo "WARNING: Node $node is not ready"
    # Don't uncordon if not ready
    continue
  fi

  # Uncordon node
  kubectl uncordon $node

  echo "Node $node upgraded successfully"
  echo "Pausing before next node..."
  sleep $PAUSE_BETWEEN_NODES
done

echo "Bulk node upgrade complete!"
```

## Monitoring Node Upgrades

Monitor the upgrade process to catch issues early.

```bash
#!/bin/bash
# monitor-node-upgrade.sh

NODE_NAME="$1"

if [ -z "$NODE_NAME" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

echo "Monitoring upgrade of $NODE_NAME..."

# Watch node status
watch -n 5 "kubectl get node $NODE_NAME -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.conditions[?(@.type==\"Ready\")].status,\
KUBELET:.status.nodeInfo.kubeletVersion,\
RUNTIME:.status.nodeInfo.containerRuntimeVersion"

# In separate terminal, watch pods
# watch -n 5 "kubectl get pods -A -o wide | grep $NODE_NAME"

# Monitor events
kubectl get events -A --watch --field-selector involvedObject.name=$NODE_NAME
```

## Handling Upgrade Failures

If a node upgrade fails, recover quickly.

```bash
#!/bin/bash
# recover-failed-node.sh

NODE_NAME="$1"

if [ -z "$NODE_NAME" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

echo "Recovering failed node: $NODE_NAME..."

# Check node status
kubectl get node $NODE_NAME
kubectl describe node $NODE_NAME | tail -30

# SSH to node and check services
ssh $NODE_NAME << 'EOF'
  # Check kubelet status
  sudo systemctl status kubelet
  sudo journalctl -u kubelet -n 50 --no-pager

  # Check containerd status
  sudo systemctl status containerd
  sudo journalctl -u containerd -n 50 --no-pager

  # Try restarting services
  sudo systemctl restart containerd
  sleep 5
  sudo systemctl restart kubelet

  # Check if containers are running
  sudo crictl ps
EOF

# If still failing, uncordon to allow investigation
kubectl uncordon $NODE_NAME

echo "Recovery attempt complete. Check logs for details."
```

## Post-Upgrade Validation

After upgrading all nodes, validate cluster functionality.

```bash
#!/bin/bash
# validate-node-upgrades.sh

TARGET_VERSION="1.29.0"

echo "Validating node upgrades..."

# Check all nodes are at target version
echo "Node versions:"
kubectl get nodes -o custom-columns=\
NODE:.metadata.name,\
KUBELET:.status.nodeInfo.kubeletVersion,\
RUNTIME:.status.nodeInfo.containerRuntimeVersion

# Verify all nodes match target
mismatched=$(kubectl get nodes -o json | \
  jq -r --arg version "v$TARGET_VERSION" \
  '.items[] | select(.status.nodeInfo.kubeletVersion != $version) | .metadata.name')

if [ ! -z "$mismatched" ]; then
  echo "WARNING: Nodes not at target version:"
  echo "$mismatched"
fi

# Check all nodes are ready
notready=$(kubectl get nodes -o json | \
  jq -r '.items[] | select(.status.conditions[] | select(.type=="Ready" and .status!="True")) | .metadata.name')

if [ ! -z "$notready" ]; then
  echo "ERROR: Nodes not ready:"
  echo "$notready"
  exit 1
fi

# Check pod health
unhealthy=$(kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded -o json | jq '.items | length')

echo "Unhealthy pods: $unhealthy"

# Run connectivity test
kubectl run test-upgrade --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default

echo "Validation complete!"
```

Upgrading kubelet and container runtimes is essential for maintaining cluster security and compatibility. By following a systematic approach with proper pod drainage, service management, and validation, you can upgrade worker nodes safely while maintaining application availability throughout the process.
