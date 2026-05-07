# How to Add Nodes to a Rancher-Managed Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Management, Node Management

Description: A practical guide to adding new nodes to your Rancher-managed Kubernetes cluster with different roles and configurations.

As your workloads grow, you need to add more nodes to your Kubernetes cluster. Rancher makes this process straightforward regardless of whether you are running a custom cluster, a node-driver provisioned cluster, or a cloud-managed cluster. This guide covers all the approaches for adding nodes to your Rancher-managed clusters.

## Prerequisites

- Administrative access to the Rancher UI
- A running Rancher-managed cluster
- New nodes meeting the cluster's system requirements
- Network connectivity between new nodes and existing cluster nodes

## Adding Nodes to Custom Clusters (RKE2/K3s)

Custom clusters are the most common type where you manually register nodes.

### Step 1: Get the Registration Command

1. Log in to the Rancher UI
2. Go to **Cluster Management**
3. Click on your cluster name
4. Click **Registration** in the cluster dashboard, or go to the cluster actions menu and select **Edit Config**

The registration command is displayed with role checkboxes.

### Step 2: Choose the Node Role

Select the appropriate role for the new node:

- **etcd**: For adding etcd members (use odd numbers: 3, 5)
- **Control Plane**: For additional API server capacity
- **Worker**: For running application workloads (most common)

### Step 3: Run the Registration Command

Copy the command with the desired role and run it on the new node.

For a worker node:

```bash
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --token <TOKEN> \
  --worker
```

For a control plane + etcd node:

```bash
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --token <TOKEN> \
  --etcd --controlplane
```

### Step 4: Add Custom Labels During Registration

You can add labels when registering a node to help with workload scheduling:

```bash
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --label 'node-type=high-memory' \
  --label 'zone=us-east-1a' \
  --token <TOKEN> \
  --worker
```

### Step 5: Monitor Node Registration

In the Rancher UI:

1. Go to your cluster
2. Navigate to **Nodes**
3. Watch the new node appear and progress from `Provisioning` to `Active`

From the command line on the new node:

```bash
sudo journalctl -u rancher-system-agent -f
```

## Adding Nodes to Node-Driver Provisioned Clusters

For clusters provisioned using node drivers (vSphere, Harvester), you add nodes by adjusting machine pools.

### Step 1: Edit the Machine Pool

1. Go to **Cluster Management**
2. Click on your cluster
3. Click **Edit Config** or **Machine Pools**
4. Find the pool you want to expand
5. Increase the **Machine Count**

### Step 2: Add a New Machine Pool

To add nodes with different specifications:

1. Click **Add Machine Pool**
2. Configure the new pool:
   - **Name**: `high-memory-workers`
   - **Machine Count**: 3
   - **Roles**: Worker
   - **CPU**: 16 cores
   - **Memory**: 64 GB
   - **Disk**: 200 GB
3. Click **Save**

Rancher will automatically provision VMs and register them with the cluster.

## Adding Nodes to Hosted Cloud Clusters

### Adding EKS Nodes

Add a new node group or expand an existing one:

1. Navigate to the EKS cluster
2. Click **Edit Config**
3. Under **Node Groups**, either:
   - Increase the desired size of an existing group
   - Click **Add Node Group** for a new group with different specifications

### Adding GKE Nodes

1. Navigate to the GKE cluster
2. Click **Edit Config**
3. Under **Node Pools**, adjust the node count or add a new pool

### Adding AKS Nodes

1. Navigate to the AKS cluster
2. Click **Edit Config**
3. Under **Node Pools**, increase the count or add a new pool

## Adding Windows Worker Nodes to Custom RKE2 Clusters

Rancher supports mixed Linux and Windows RKE2 custom clusters. This only works for clusters created with Windows support enabled, and the Windows registration command appears only after the cluster is running with Linux etcd, control plane, and worker nodes. To add a Windows worker node:

1. In the cluster registration page, select the **Worker** role
2. Copy the Windows worker registration command
3. Run it on the Windows Server node (PowerShell):

```powershell
Invoke-WebRequest -Uri "https://rancher.yourdomain.com/wins-agent-install.ps1" -OutFile agent-install.ps1
.\agent-install.ps1 -Server "https://rancher.yourdomain.com" -Token "<TOKEN>" -Worker
```

Note: Windows nodes can only serve as worker nodes, not control plane or etcd nodes.

## Node Preparation Best Practices

Before adding any node, ensure it meets your cluster's distribution-specific requirements and that the node has enough resources for Kubernetes system components and your workloads:

### System Requirements

```bash
# Check available resources

free -h          # Memory
nproc            # CPU cores
df -h /          # Disk space
```

### Network Requirements

The exact ports vary by cluster type and CNI. For custom clusters, verify the ports required by your Kubernetes distribution:

```bash
# Verify connectivity to Rancher
curl -sk https://rancher.yourdomain.com/healthz

# Verify connectivity to existing cluster nodes
ping <EXISTING_NODE_IP>

# For K3s and RKE2 custom clusters, verify the Kubernetes API on a server node
nc -zv <SERVER_NODE_IP> 6443

# For RKE2 custom clusters, verify the supervisor / registration port on a server node
nc -zv <SERVER_NODE_IP> 9345
```

### DNS Configuration

```bash
# Verify DNS resolution
nslookup rancher.yourdomain.com
```

### Time Synchronization

```bash
# Ensure the system clock is synchronized
timedatectl status
```

## Verifying the New Node

After the node joins the cluster:

```bash
# Check node status
kubectl get nodes -o wide

# Verify node is ready
kubectl describe node <NEW_NODE_NAME> | grep -A5 "Conditions"

# Check that pods are scheduling on the new node
kubectl get pods -A -o wide | grep <NEW_NODE_NAME>
```

### Verify Node Resources

If metrics-server is installed:

```bash
kubectl top node <NEW_NODE_NAME>
```

### Test Pod Placement on the New Node

Deploy a test workload to verify the new node can run a pod:

```bash
kubectl run test-pod --image=nginx --restart=Never \
  --overrides='{"spec":{"nodeName":"<NEW_NODE_NAME>"}}'

kubectl get pod test-pod -o wide
kubectl delete pod test-pod
```

## Troubleshooting

- **Node stuck in Provisioning**: Check the system-agent logs with `journalctl -u rancher-system-agent`. Verify network connectivity.
- **Node shows NotReady**: Check the node service logs. For RKE2, use `journalctl -u rke2-server` or `journalctl -u rke2-agent`. For K3s, use `journalctl -u k3s` or `journalctl -u k3s-agent`.
- **Registration command no longer works**: Copy the current registration command from the Rancher UI again and rerun it on the node.
- **Node has the wrong role**: Remove the node and re-register it with the correct role selection.
- **Pods not scheduling**: Check for taints on the new node with `kubectl describe node <NODE_NAME> | grep Taints`.

## Conclusion

Adding nodes to a Rancher-managed cluster is tailored to your cluster type. Custom clusters use registration commands, node-driver clusters use machine pool scaling, and cloud clusters use their respective node group or pool mechanisms. Regardless of the method, always prepare nodes with the proper system requirements, verify network connectivity, and confirm the node is healthy after joining the cluster.
