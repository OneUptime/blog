# How to Create a Custom Kubernetes Cluster in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Management

Description: Step-by-step guide to creating a custom Kubernetes cluster in Rancher using your own infrastructure nodes.

Rancher's custom cluster option lets you build a Kubernetes cluster on your own infrastructure, whether it is bare metal servers, virtual machines, or cloud instances. You have full control over node selection and role assignment. This guide walks you through creating a custom cluster in Rancher from start to finish.

## Prerequisites

- A running Rancher installation (v2.7 or later)
- One or more supported Linux nodes for the Kubernetes distribution you choose. Verify the current Rancher support matrix for validated operating system versions.
  - Minimum 4 GB RAM and 2 CPUs per node
  - Network connectivity between all nodes
  - Shell or console access to each node
  - RKE2 and K3s install and manage `containerd` for you, so you do not need to preinstall Docker
- Connectivity from each node to the Rancher server on port 443
- The required ports for your chosen Kubernetes distribution and CNI open between nodes. For a typical RKE2 cluster, this includes `6443/TCP`, `9345/TCP`, `10250/TCP`, `2379-2380/TCP`, plus CNI-specific ports such as `8472/UDP` and `9099/TCP` for Canal or `4789/UDP` for Calico VXLAN

## Step 1: Access the Cluster Creation Wizard

Log in to the Rancher UI and navigate to cluster creation:

1. Click **Cluster Management** in the left sidebar
2. Click the **Create** button
3. Select **Custom** from the cluster type options

## Step 2: Configure Cluster Settings

### Name and Description

- Enter a descriptive cluster name (e.g., `production-custom`)
- Add an optional description

### Kubernetes Version

Select the Kubernetes version for your cluster. Choose a version that is compatible with your workloads and within the Rancher support matrix.

### Kubernetes Distribution

Choose between:

- **RKE2** (recommended): CNCF-certified, CIS-hardened, uses containerd
- **K3s**: Lightweight, suitable for edge and resource-constrained environments

### Network Configuration

Configure the cluster network plugin:

```yaml
# For RKE2, the default CNI is Canal

# You can also choose Calico or Cilium
```

In the Rancher UI, select your preferred CNI under the network settings.

## Step 3: Configure Advanced Options

### Cloud Provider

If your nodes are running on a cloud provider, select the appropriate cloud provider option (AWS, Azure, GCE, or vSphere) so that Kubernetes can manage cloud resources like load balancers and persistent volumes.

### Private Registry

If you use a private container registry, configure it in the cluster settings. For RKE2 or K3s, a minimal `registries.yaml` mirror configuration looks like:

```yaml
mirrors:
  docker.io:
    endpoint:
      - "https://registry.yourdomain.com"
```

### Authorized Cluster Endpoint

Enable the authorized cluster endpoint to allow direct kubectl access to the cluster without going through Rancher:

This creates a direct connection to the Kubernetes API server, useful for scenarios where Rancher is temporarily unavailable.

## Step 4: Generate the Registration Command

After configuring the cluster settings, Rancher generates a registration command. This command is what you run on each node to join it to the cluster.

You will see options to select node roles:

- **etcd**: Runs the etcd datastore (use 3 nodes for HA)
- **Control Plane**: Runs the Kubernetes control plane components
- **Worker**: Runs your application workloads

For a production cluster, the recommended layout is:

- 3 nodes with etcd + control plane roles
- 2 or more nodes with the worker role

## Step 5: Register the Control Plane Nodes

Copy the registration command with the etcd and control plane roles selected. The command looks something like:

```bash
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | \
  sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --token <TOKEN> \
  --etcd --controlplane
```

Log in to each control plane node and run the command:

```bash
ssh user@node1
# Run the registration command
```

Repeat for all control plane nodes. Wait for each node to register and appear in the Rancher UI before proceeding.

## Step 6: Register the Worker Nodes

Copy the registration command with only the worker role selected:

```bash
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | \
  sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --token <TOKEN> \
  --worker
```

Run this on each worker node:

```bash
ssh user@worker1
# Run the worker registration command
```

## Step 7: Monitor Cluster Provisioning

Back in the Rancher UI, watch the cluster provisioning progress:

1. Navigate to **Cluster Management**
2. Click on your new cluster
3. Watch the cluster status until it becomes `Active`

You can also check progress from the command line if you have kubectl access:

```bash
# Once the cluster is provisioned, download the kubeconfig from Rancher UI
kubectl get nodes
kubectl get pods -A
```

The cluster provisioning typically takes 5 to 15 minutes depending on network speed and node performance.

## Step 8: Verify the Cluster

Once the cluster shows as `Active`, verify it:

```bash
# Check node status
kubectl get nodes -o wide

# Check system pods
kubectl get pods -n kube-system

# Check cluster info
kubectl cluster-info
```

From the Rancher UI:

- Verify all nodes show as `Active` with correct roles
- Check the cluster dashboard for resource utilization
- Verify the kubectl shell works from the Rancher UI

## Step 9: Configure Cluster Features

After the cluster is created, configure additional features:

### Enable Monitoring

Navigate to your cluster in Rancher, open **Cluster Tools**, and install **Monitoring** to get Prometheus and Grafana dashboards.

### Configure Storage

Set up or verify a default storage class for persistent volumes. K3s includes the `local-path` storage class by default. On RKE2, install a CSI driver or storage platform such as Longhorn before setting a default storage class.

### Set Up Namespaces and Projects

Create projects and namespaces to organize your workloads:

1. Go to your cluster in Rancher
2. Navigate to **Projects/Namespaces**
3. Create projects for different teams or applications
4. Assign namespaces to projects

## Troubleshooting

- **Node not registering**: Check that the node can reach the Rancher server URL on port 443. Verify DNS resolution and firewall rules.
- **Cluster stuck in Provisioning**: Check the system agent logs on the node with `journalctl -u rancher-system-agent -f`.
- **Node shows NotReady**: Check kubelet logs and verify the container runtime is running.
- **Network issues between pods**: Verify the CNI plugin is deployed and working. Check that required ports are open between nodes.

## Conclusion

Creating a custom Kubernetes cluster in Rancher gives you full control over your infrastructure while benefiting from Rancher's management capabilities. Select your nodes, assign roles, run the registration commands, and Rancher handles the rest. This approach works well for on-premises environments, bare metal servers, and any scenario where you need to control exactly which machines join your cluster.
