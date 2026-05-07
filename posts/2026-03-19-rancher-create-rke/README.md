# How to Create an RKE Cluster in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RKE, Cluster Management

Description: Learn how to create and configure an RKE (Rancher Kubernetes Engine) cluster using the Rancher management UI.

RKE (Rancher Kubernetes Engine) is a CNCF-certified Kubernetes distribution that runs entirely within Docker containers. While RKE2 is the newer successor, RKE1 is now a legacy option: it reached end of life on July 31, 2025, and Rancher 2.12.0 and later no longer support provisioning or managing downstream RKE1 clusters. This guide applies to Rancher environments that still support RKE1, such as Rancher v2.11.x.

## Prerequisites

- A running Rancher installation that still supports RKE1 provisioning (for example, Rancher v2.11.x)
- At least one Linux node with:
  - Docker installed using a supported version from the Rancher/RKE support matrix
  - Minimum 4 GB RAM and 2 CPUs
  - SSH access configured
  - A supported 64-bit Linux OS from the Rancher/RKE support matrix
- Network connectivity between all nodes and to the Rancher server

## Step 1: Prepare the Nodes

### Install Docker

On each node, install a Rancher-supported upstream Docker release:

```bash
# Replace <DOCKER_VERSION> with a supported major.minor version
# from the Rancher/RKE support matrix.
curl -fsSL https://releases.rancher.com/install-docker/<DOCKER_VERSION>.sh | sh
sudo usermod -aG docker $USER
```

Verify Docker is running:

```bash
docker version
```

### Configure Node Requirements

Disable swap on worker nodes:

```bash
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab
```

Load the required bridge module:

```bash
cat <<EOF | sudo tee /etc/modules-load.d/rke.conf
br_netfilter
EOF

sudo modprobe br_netfilter
```

Configure sysctl settings:

```bash
cat <<EOF | sudo tee /etc/sysctl.d/rke.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

### Open Required Ports

Ensure the required Rancher and cluster ports are open:

| Port | Protocol | Purpose |
|------|----------|---------|
| 443 | TCP | Nodes to the Rancher URL (the Rancher server directly, or an external Rancher load balancer) |
| 2379-2380 | TCP | etcd client and peer traffic |
| 6443 | TCP | Kubernetes API |
| 8472 | UDP | Canal/Flannel VXLAN |
| 9099 | TCP | Canal/Flannel local liveness/readiness checks |
| 10250 | TCP | kubelet |
| 10254 | TCP | Ingress controller local liveness/readiness checks |

If you plan to enable Rancher Monitoring later, also allow TCP port `9796` on each node.

## Step 2: Create the Cluster in Rancher

1. Log in to the Rancher UI
2. Click **Cluster Management** in the left sidebar
3. Click **Create**
4. Select **Custom** to create an RKE cluster

## Step 3: Configure Cluster Settings

### Basic Settings

- **Cluster Name**: Enter a descriptive name (e.g., `production-rke`)
- **Description**: Optional description for the cluster

### Kubernetes Version

Select the Kubernetes version. Choose a version within the RKE support matrix for your Rancher version.

### Network Provider

Select the CNI plugin:

- **Canal** (default): Combines Flannel for networking and Calico for network policy
- **Calico**: Full Calico implementation
- **Flannel**: Simple overlay networking
- **Weave**: Mesh networking (deprecated for Kubernetes v1.27+)

### Cloud Provider

If running on a cloud provider, select it to enable cloud-specific features:

- **AWS**: Enables ELB, EBS volume provisioning
- **Azure**: Enables Azure LB, Azure Disk
- **vSphere**: Enables vSphere volume provisioning

### Private Registry

If using a private registry, configure it:

```plaintext
URL: registry.yourdomain.com
User: registry-user
Password: registry-password
```

## Step 4: Configure Advanced Options

### Authorization

Choose the authorization mode:

- **RBAC** (recommended): Role-Based Access Control
- PodSecurityPolicy support is only available on older Kubernetes versions; PodSecurityPolicy was removed in Kubernetes v1.25

### Audit Logging

Enable audit logging to track API requests:

```yaml
services:
  kube-api:
    audit_log:
      enabled: true
      configuration:
        max_age: 30
        max_backup: 10
        max_size: 100
```

### etcd Settings

Configure etcd backup schedule:

- **Backup interval**: 12 hours
- **Backup retention**: 6 copies
- **S3 backup** (optional): Configure S3 settings for off-cluster backups

## Step 5: Add Nodes to the Cluster

After saving the cluster configuration, Rancher generates registration commands for each node role.

### Add etcd and Control Plane Nodes

Select the **etcd** and **Control Plane** checkboxes and copy the Docker command:

```bash
sudo docker run -d --privileged --restart=unless-stopped \
  --net=host \
  -v /etc/kubernetes:/etc/kubernetes \
  -v /var/run:/var/run \
  rancher/rancher-agent:<VERSION> \
  --server https://rancher.yourdomain.com \
  --token <TOKEN> \
  --ca-checksum <CHECKSUM> \
  --etcd --controlplane
```

Run this on 3 nodes for a highly available control plane.

### Add Worker Nodes

Select only the **Worker** checkbox and copy the command:

```bash
sudo docker run -d --privileged --restart=unless-stopped \
  --net=host \
  -v /etc/kubernetes:/etc/kubernetes \
  -v /var/run:/var/run \
  rancher/rancher-agent:<VERSION> \
  --server https://rancher.yourdomain.com \
  --token <TOKEN> \
  --ca-checksum <CHECKSUM> \
  --worker
```

Run this on each worker node.

## Step 6: Monitor Provisioning

In the Rancher UI, watch the cluster provisioning:

1. Navigate to your cluster
2. Watch nodes appear and roles get assigned
3. Monitor the status as it progresses through provisioning stages

Check provisioning logs from the Rancher UI if there are issues.

## Step 7: Verify the Cluster

Once the cluster shows `Active`:

```bash
# Download kubeconfig from Rancher UI
kubectl get nodes -o wide
kubectl get pods -n kube-system
kubectl cluster-info
```

Verify each component:

- All nodes show as `Ready`
- System pods (coredns, your selected CNI plugin, metrics-server) are running
- Ingress controller is deployed

## Step 8: Post-Creation Configuration

### Deploy Workloads

Test the cluster with a sample deployment:

```bash
kubectl create deployment nginx --image=nginx --replicas=3 --port=80
kubectl expose deployment nginx --port=80 --target-port=80 --type=LoadBalancer
kubectl get svc nginx
```

### Enable Monitoring

Install the monitoring stack from **Cluster Tools** or **Apps > Charts** to get Prometheus and Grafana dashboards.

### Configure Backups

Verify that etcd backups are running on schedule:

1. Go to the cluster in Rancher
2. Check **Snapshots** to see backup history

## Troubleshooting

- **Node not joining**: Verify Docker is running and the node can reach the Rancher server. Check `docker logs` on the rancher-agent container.
- **etcd health issues**: Ensure an odd number of etcd nodes (1, 3, or 5) and check etcd logs.
- **Networking problems**: Verify the CNI plugin pods are running and that the required ports are open between nodes and to the Rancher server.
- **Provisioning timeout**: Check Rancher server logs for errors related to the cluster provisioning.

## Conclusion

Creating an RKE cluster in Rancher is a guided process that handles the complexity of Kubernetes installation for you. Prepare your nodes with Docker and networking requirements, configure the cluster settings in the Rancher UI, run the registration commands on your nodes, and Rancher takes care of provisioning the entire Kubernetes cluster. For new deployments, use RKE2 as the actively developed successor; RKE1 is now a legacy option for Rancher environments that still support it.
