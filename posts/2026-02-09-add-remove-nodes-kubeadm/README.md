# How to Add and Remove Nodes from a Running Kubernetes Cluster with kubeadm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubeadm, Cluster Administration

Description: Learn how to dynamically add worker nodes and control plane nodes to an existing Kubernetes cluster, and safely remove nodes using kubeadm for cluster scaling and maintenance operations.

---

Kubernetes clusters need to scale dynamically as workload demands change. Adding nodes increases capacity, while removing nodes reduces costs or facilitates maintenance. kubeadm provides straightforward commands for joining new nodes and removing existing ones from a cluster. Understanding the proper procedures prevents workload disruptions and maintains cluster health.

This guide demonstrates how to add and remove both worker and control plane nodes from a running cluster.

## Prerequisites for Adding Nodes

Before adding nodes, ensure:

```bash
# On the new node:
# 1. Compatible OS (Ubuntu 20.04/22.04, RHEL 8+, etc.)
# 2. Container runtime installed (containerd, CRI-O)
# 3. kubeadm, kubelet, kubectl installed
# 4. Network connectivity to control plane
# 5. Unique hostname and MAC address

# Install prerequisites on new node
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl

# Add Kubernetes repository
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Install kubeadm, kubelet, kubectl
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# Enable kubelet
sudo systemctl enable kubelet
```

## Generating Join Token

On control plane node, create a join token:

```bash
# Create new join token (valid for 24 hours)
sudo kubeadm token create --print-join-command

# Output example:
# kubeadm join 10.0.0.10:6443 --token abc123.xyz789 --discovery-token-ca-cert-hash sha256:1234567890abcdef...

# List existing tokens
sudo kubeadm token list

# Create token with custom TTL
sudo kubeadm token create --ttl 48h --print-join-command

# Create token that doesn't expire
sudo kubeadm token create --ttl 0 --print-join-command
```

If you lost the join command:

```bash
# Get discovery token CA cert hash
openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | \
  openssl rsa -pubin -outform der 2>/dev/null | \
  openssl dgst -sha256 -hex | sed 's/^.* //'

# Reconstruct join command
CONTROL_PLANE_IP=10.0.0.10
TOKEN=$(sudo kubeadm token list | grep authentication | awk '{print $1}')
CA_CERT_HASH=<hash-from-above>

echo "kubeadm join ${CONTROL_PLANE_IP}:6443 --token ${TOKEN} --discovery-token-ca-cert-hash sha256:${CA_CERT_HASH}"
```

## Adding a Worker Node

Join a new worker node to the cluster:

```bash
# On the new worker node, run the join command
sudo kubeadm join 10.0.0.10:6443 \
  --token abc123.xyz789 \
  --discovery-token-ca-cert-hash sha256:1234567890abcdef...

# Output shows:
# [preflight] Running pre-flight checks
# [kubelet-start] Writing kubelet environment file with flags to file "/var/lib/kubelet/kubeadm-flags.env"
# [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
# [kubelet-start] Starting the kubelet
# [kubelet-start] Waiting for the kubelet to perform the TLS Bootstrap...
# This node has joined the cluster:
# * Certificate signing request was sent to apiserver and a response was received.
# * The Kubelet was informed of the new secure connection details.

# On control plane, verify node joined
kubectl get nodes

# Wait for node to become Ready
kubectl get nodes -w
```

Label the new worker node:

```bash
# Add role label
kubectl label node <node-name> node-role.kubernetes.io/worker=worker

# Add custom labels
kubectl label node <node-name> env=production
kubectl label node <node-name> nodesize=large
```

## Adding a Control Plane Node

For high availability, add additional control plane nodes:

```bash
# On existing control plane, upload certificates
sudo kubeadm init phase upload-certs --upload-certs

# Output shows certificate key (valid for 2 hours):
# [upload-certs] Storing the certificates in Secret "kubeadm-certs" in the "kube-system" Namespace
# [upload-certs] Using certificate key:
# abc123def456...

# Generate control plane join command
sudo kubeadm token create --print-join-command --certificate-key abc123def456...

# Output:
# kubeadm join 10.0.0.10:6443 --token xyz.abc --discovery-token-ca-cert-hash sha256:123... --control-plane --certificate-key abc123def456...
```

On new control plane node:

```bash
# Join as control plane
sudo kubeadm join 10.0.0.10:6443 \
  --token xyz.abc \
  --discovery-token-ca-cert-hash sha256:123... \
  --control-plane \
  --certificate-key abc123def456...

# Set up kubectl access
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Verify control plane nodes
kubectl get nodes -l node-role.kubernetes.io/control-plane
```

## Adding Nodes with Custom Configuration

Join with specific kubelet config:

```bash
# Create custom kubelet config
cat > kubelet-config.yaml <<EOF
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 200
systemReserved:
  cpu: 1000m
  memory: 2Gi
kubeReserved:
  cpu: 1000m
  memory: 2Gi
EOF

# Join with custom config
sudo kubeadm join 10.0.0.10:6443 \
  --token abc123.xyz789 \
  --discovery-token-ca-cert-hash sha256:123... \
  --config kubelet-config.yaml
```

## Verifying Node Addition

Check node status:

```bash
# List all nodes
kubectl get nodes -o wide

# Check node details
kubectl describe node <new-node-name>

# Verify node conditions
kubectl get nodes <new-node-name> -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

# Check node resources
kubectl describe node <new-node-name> | grep -A 5 "Allocatable"

# Verify kubelet is running
ssh <new-node> "sudo systemctl status kubelet"
```

## Removing a Worker Node

Safely remove a worker node:

```bash
# Step 1: Drain the node (evict all pods)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Output shows:
# node/<node-name> cordoned
# evicting pod default/nginx-xxx
# evicting pod kube-system/coredns-xxx
# pod/nginx-xxx evicted
# node/<node-name> drained

# Step 2: Verify pods migrated
kubectl get pods --all-namespaces -o wide | grep <node-name>

# Step 3: Delete node from cluster
kubectl delete node <node-name>

# Step 4: On the removed node, reset kubeadm
ssh <node-name>
sudo kubeadm reset
# Confirm with 'yes' when prompted

# Step 5: Clean up (optional)
sudo rm -rf /etc/kubernetes/
sudo rm -rf /var/lib/kubelet/
sudo rm -rf /var/lib/etcd/
sudo rm -rf ~/.kube
```

## Removing a Control Plane Node

Remove control plane node from HA cluster:

```bash
# Step 1: Drain the node
kubectl drain <control-plane-node> --ignore-daemonsets --delete-emptydir-data

# Step 2: Remove etcd member (if using stacked etcd)
# Get etcd member ID
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member list

# Remove etcd member
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member remove <member-id>

# Step 3: Delete node from Kubernetes
kubectl delete node <control-plane-node>

# Step 4: On removed node, reset kubeadm
sudo kubeadm reset

# Step 5: Clean up
sudo rm -rf /etc/kubernetes/
sudo rm -rf /var/lib/etcd/
```

## Handling Node Removal Issues

**Issue: Pods stuck in Terminating**

```bash
# Force delete stuck pods
kubectl delete pod <pod-name> --grace-period=0 --force

# Delete all terminating pods
kubectl get pods | grep Terminating | awk '{print $1}' | xargs kubectl delete pod --grace-period=0 --force
```

**Issue: Node won't drain**

```bash
# Check what's preventing drain
kubectl drain <node-name> --dry-run=client --ignore-daemonsets

# Drain with extended timeout
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --timeout=300s

# Force drain (use carefully)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --force
```

**Issue: etcd member removal fails**

```bash
# Check etcd cluster health
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint health

# Force remove if node is down
ETCDCTL_API=3 etcdctl member remove <member-id> --force
```

## Automating Node Addition

Create a script for adding workers:

```bash
#!/bin/bash
# add-worker-node.sh

NEW_NODE=$1
JOIN_CMD=$2

if [ -z "$NEW_NODE" ] || [ -z "$JOIN_CMD" ]; then
  echo "Usage: $0 <new-node-ip> <join-command>"
  exit 1
fi

# Copy prerequisites to new node
scp setup-node.sh $NEW_NODE:/tmp/

# Run setup
ssh $NEW_NODE "sudo bash /tmp/setup-node.sh"

# Join cluster
ssh $NEW_NODE "sudo $JOIN_CMD"

# Verify
sleep 30
kubectl get nodes | grep $NEW_NODE
```

## Monitoring Node Changes

Track node additions and removals:

```bash
# Watch nodes
kubectl get nodes -w

# Monitor events
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | grep -i node

# Check node count
kubectl get nodes --no-headers | wc -l

# Alert on node count changes
cat > check-node-count.sh <<'EOF'
#!/bin/bash
EXPECTED_COUNT=10
ACTUAL_COUNT=$(kubectl get nodes --no-headers | wc -l)

if [ $ACTUAL_COUNT -ne $EXPECTED_COUNT ]; then
  echo "WARNING: Expected $EXPECTED_COUNT nodes, found $ACTUAL_COUNT"
  exit 1
fi
EOF
```

## Best Practices

1. **Drain before removal**: Always drain nodes before removing them

2. **Verify migration**: Ensure pods migrated successfully before deleting node

3. **Document changes**: Record why nodes were added/removed

4. **Test in staging**: Practice node operations in non-production first

5. **Monitor cluster health**: Watch for issues after node changes

6. **Keep tokens secure**: Treat join tokens as secrets

7. **Use labels**: Label nodes for organization and scheduling

Complete node addition workflow:

```bash
# 1. Generate join token
JOIN_CMD=$(sudo kubeadm token create --print-join-command)

# 2. Prepare new node
ssh new-node "sudo apt-get update && sudo apt-get install -y kubeadm kubelet kubectl"

# 3. Join cluster
ssh new-node "sudo $JOIN_CMD"

# 4. Label node
kubectl label node new-node node-role.kubernetes.io/worker=worker

# 5. Verify
kubectl get nodes
kubectl get pods --all-namespaces -o wide | grep new-node
```

Adding and removing nodes from Kubernetes clusters is a routine operations task. Use kubeadm's built-in commands for joining nodes, always drain nodes before removal to ensure pod migration, monitor cluster health during node changes, and maintain documentation of cluster topology changes for operational continuity.
