# How to Add and Remove Nodes in RKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE, Kubernetes, Rancher, Node Management, Scaling

Description: Learn how to dynamically add worker and control plane nodes to an RKE cluster and safely remove nodes without disrupting workloads.

## Introduction

Scaling an RKE cluster by adding or removing nodes is a common operational task. RKE manages all node operations through the `cluster.yml` configuration file - to add or remove a node, you modify the file and re-run `rke up`. This guide covers both operations with safety best practices.

Note: RKE1 reached end of life on July 31, 2025. Use this guide for maintaining existing RKE1 clusters; use RKE2 for new deployments.

## Adding a New Worker Node

### Step 1: Prepare the New Node

On the new worker node, install a Docker Engine version supported by your RKE/Kubernetes release and configure SSH access:

```bash
# Install Docker on the new node

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker

# Enable required networking sysctls
sudo modprobe br_netfilter
sudo sysctl -w net.bridge.bridge-nf-call-iptables=1
sudo sysctl -w net.ipv4.ip_forward=1
printf "net.bridge.bridge-nf-call-iptables = 1\nnet.ipv4.ip_forward = 1\n" | sudo tee /etc/sysctl.d/90-rke.conf

# Disable swap (also remove or comment swap entries in /etc/fstab)
sudo swapoff -a

# Test SSH from your RKE management node
ssh ubuntu@192.168.1.106 docker ps
```

### Step 2: Add the Node to cluster.yml

Edit your `cluster.yml` to include the new node:

```yaml
# cluster.yml - Add the new worker node to the nodes list
nodes:
  # Existing nodes...
  - address: 192.168.1.101
    user: ubuntu
    role: [controlplane, etcd]
  - address: 192.168.1.104
    user: ubuntu
    role: [worker]

  # NEW WORKER NODE
  - address: 192.168.1.106
    hostname_override: worker-03
    user: ubuntu
    role: [worker]
    labels:
      tier: worker
      environment: production
```

### Step 3: Apply the Change

```bash
# Run rke up to add the new node
rke up --config cluster.yml

# RKE will detect the new node and provision it
```

### Step 4: Verify the Node Joined

```bash
export KUBECONFIG=kube_config_cluster.yml

# Check the new node appears
kubectl get nodes -o wide

# Wait for it to be Ready
kubectl wait --for=condition=Ready node/worker-03 --timeout=120s
```

## Adding a New Control Plane / etcd Node

Adding control plane nodes for HA follows the same process:

```yaml
# cluster.yml - Add a new control plane + etcd node
nodes:
  # Existing nodes
  - address: 192.168.1.101
    user: ubuntu
    role: [controlplane, etcd]
  - address: 192.168.1.102
    user: ubuntu
    role: [controlplane, etcd]

  # NEW CONTROL PLANE + etcd NODE
  - address: 192.168.1.103
    hostname_override: master-03
    user: ubuntu
    role:
      - controlplane
      - etcd
```

```bash
# Apply the change
rke up --config cluster.yml

# Verify the new control plane / etcd node joined
export KUBECONFIG=kube_config_cluster.yml
kubectl get nodes -o wide

# Verify etcd membership from any etcd node
ssh ubuntu@192.168.1.103 "sudo docker exec etcd etcdctl member list"
```

## Removing a Worker Node

### Step 1: Drain the Node

```bash
export KUBECONFIG=kube_config_cluster.yml

# Cordon the node to prevent new pods from being scheduled
kubectl cordon worker-03

# Drain the node - evicts all pods gracefully
kubectl drain worker-03 \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --force \
    --grace-period=60

# Verify all pods have been evicted
kubectl get pods --all-namespaces -o wide | grep worker-03
```

### Step 2: Remove from cluster.yml

Delete the node entry from `cluster.yml`:

```yaml
# cluster.yml - Remove the worker node (delete its entry)
nodes:
  - address: 192.168.1.101
    user: ubuntu
    role: [controlplane, etcd]
  # worker-03 (192.168.1.106) entry removed
  - address: 192.168.1.104
    user: ubuntu
    role: [worker]
```

### Step 3: Apply the Change

```bash
# Run rke up to synchronize the cluster state
rke up --config cluster.yml
```

### Step 4: Confirm the Node Object Is Removed

```bash
# RKE normally removes the node object during reconcile.
# Remove it manually if it is still present.
kubectl delete node worker-03 --ignore-not-found

# Confirm it is removed
kubectl get nodes
```

### Step 5: Clean Up the Node (Optional)

If you want to repurpose the removed node:

```bash
# On the removed node, clean up Docker containers and data
sudo docker stop $(sudo docker ps -aq) 2>/dev/null || true
sudo docker rm $(sudo docker ps -aq) 2>/dev/null || true
sudo docker volume prune -f
sudo rm -rf /etc/kubernetes/ /var/lib/kubelet/ /var/lib/rancher/
```

## Removing an etcd Node

Removing an etcd node from an HA cluster requires extra care. Always maintain an odd number of etcd members (1, 3, or 5).

```bash
# Before removing, snapshot etcd
rke etcd snapshot-save --name pre-removal-snapshot --config cluster.yml

# Remove the etcd node from cluster.yml
# (same process as above - remove the node entry)

# Run rke up - RKE will remove the etcd member
rke up --config cluster.yml

# Verify etcd membership after removal
# From any remaining etcd node:
sudo docker exec etcd etcdctl member list
```

## Rolling Node Replacement

To replace a node with new hardware without downtime:

```bash
# 1. Add the new node to cluster.yml and run rke up
# 2. Verify the new node is Ready
# 3. Drain the old node
kubectl drain <old-node> --ignore-daemonsets --delete-emptydir-data
# 4. Remove the old node from cluster.yml and run rke up
# 5. Delete the old node object if it remains
kubectl delete node <old-node> --ignore-not-found
```

## Troubleshooting Node Addition

### Node fails to join with SSH errors

```bash
# Test SSH connectivity manually
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no ubuntu@192.168.1.106 docker ps

# Check SSH key permissions
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

### Node shows NotReady after joining

```bash
# Check node conditions
kubectl describe node <new-node> | grep -A 10 "Conditions:"

# Check Docker on the new node
ssh ubuntu@192.168.1.106 sudo systemctl status docker

# Check kubelet container logs on the new node
ssh ubuntu@192.168.1.106 sudo docker logs kubelet 2>&1 | tail -50
```

## Conclusion

Adding and removing nodes in RKE is managed entirely through the `cluster.yml` file. Always drain worker nodes before removal to avoid workload disruption, and take an etcd snapshot before making any changes to the cluster topology. The idempotent nature of `rke up` makes it safe to re-run after configuration changes, ensuring the cluster converges to the desired state.
